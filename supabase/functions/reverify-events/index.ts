// Nightly re-verification job.
// Re-checks events that have a source_url + source_quote by re-fetching the
// source page and confirming the verbatim quote still appears. Updates
// events.verification_status and events.last_verified_at, and logs a
// reverification_runs row.
//
// Verification status transitions:
//   verified  -> page fetched and source_quote still present.
//   stale     -> page fetched but source_quote no longer present (event may
//                have been changed / removed from listing).
//   missing   -> source URL failed to fetch (HTTP error, network error).
//   unverified-> no source_quote on record (cannot verify) — left untouched
//                except for last_verified_at bump.
//
// Triggered by pg_cron daily; can also be called by an admin from the UI.

import { adminClient, authorizeAdminOrCron, readEnv } from "../_shared/supabase.ts";
import { errors as httpErr, json, preflight } from "../_shared/http.ts";
import { recheckStoredEvidence } from "../_shared/evidence.ts";

const BATCH_SIZE = 80;
const STALE_REFRESH_HOURS = 20; // skip rows verified within this window
const FETCH_TIMEOUT_MS = 15_000;

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FindAWalkOnBot/1.0; +https://findawalkon.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60_000);
  } finally {
    clearTimeout(t);
  }
}

async function fetchViaFirecrawl(url: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 2000,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}`);
  const data = await res.json();
  const md: string = data?.data?.markdown ?? data?.markdown ?? "";
  return md.replace(/\s+/g, " ").trim().slice(0, 60_000);
}

const FIRECRAWL_HOSTS = [
  /(^|\.)facebook\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)eventbrite\.(co\.uk|com)$/i,
];

function shouldUseFirecrawl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return FIRECRAWL_HOSTS.some((re) => re.test(h));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const env = readEnv();
  if (!env) return httpErr.missingEnv();

  const auth = await authorizeAdminOrCron(req, env);
  if (!auth.ok) return auth.response;
  const triggeredBy = auth.triggeredBy;
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

  const supabase = adminClient(env);

  // Open a run row.
  const { data: runRow, error: runErr } = await supabase
    .from("reverification_runs")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select("id")
    .single();
  if (runErr || !runRow) {
    return json({ error: runErr?.message ?? "run insert failed" }, { status: 500 });
  }
  const runId = runRow.id;

  const today = new Date().toISOString().slice(0, 10);
  const refreshCutoff = new Date(Date.now() - STALE_REFRESH_HOURS * 3600_000).toISOString();

  // Candidates: upcoming events with a source URL, not verified recently.
  const { data: candidates, error: selErr } = await supabase
    .from("events")
    .select("id, title, event_date, source_url, source_quote, verification_status, last_verified_at")
    .neq("verification_status", "quarantined")
    .gte("event_date", today)
    .not("source_url", "is", null)
    .or(`last_verified_at.is.null,last_verified_at.lt.${refreshCutoff}`)
    .order("last_verified_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (selErr) {
    await supabase.from("reverification_runs").update({
      status: "error",
      finished_at: new Date().toISOString(),
      errors: [{ stage: "select", message: selErr.message }],
    }).eq("id", runId);
    return json({ error: selErr.message }, { status: 500 });
  }

  // Cache pages per URL within this run so multiple events from same source
  // only cost one fetch.
  const pageCache = new Map<string, string | null>();
  const errors: Array<{ event_id: string; message: string }> = [];
  let checked = 0;
  let verified = 0;
  let flagged = 0;
  const nowIso = new Date().toISOString();

  for (const ev of candidates ?? []) {
    checked++;
    const url = ev.source_url as string;
    // Strict re-check: the full stored excerpt must still be on the page AND
    // state this event's exact date. Only the evidence status changes —
    // listing (is_verified) and event details are never touched here.
    let text: string | null = null;
    if (ev.source_quote) {
      if (pageCache.has(url)) text = pageCache.get(url) ?? null;
      else {
        try {
          if (firecrawlKey && shouldUseFirecrawl(url)) text = await fetchViaFirecrawl(url, firecrawlKey);
          else text = await fetchPageText(url);
        } catch {
          text = null;
        }
        pageCache.set(url, text);
      }
    }
    const { status: newStatus, note: notes } = recheckStoredEvidence(
      { event_date: ev.event_date as string, source_quote: (ev.source_quote as string | null) ?? null },
      text,
    );
    if (newStatus === "source_confirmed") verified++;
    else flagged++;

    const { error: upErr } = await supabase
      .from("events")
      .update({
        verification_status: newStatus,
        verification_notes: notes,
        last_verified_at: nowIso,
      })
      .eq("id", ev.id as string);
    if (upErr) {
      errors.push({ event_id: ev.id as string, message: upErr.message });
    }
  }

  await supabase.from("reverification_runs").update({
    status: errors.length ? "partial" : "success",
    finished_at: new Date().toISOString(),
    events_checked: checked,
    events_verified: verified,
    events_flagged: flagged,
    errors,
  }).eq("id", runId);

  return json({
    ok: true,
    run_id: runId,
    checked,
    verified,
    flagged,
    errors_count: errors.length,
  });
});
