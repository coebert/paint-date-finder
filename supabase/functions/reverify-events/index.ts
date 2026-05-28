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

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function quoteFound(quote: string, haystack: string): boolean {
  const needle = normalize(quote).slice(0, 200);
  if (needle.length < 6) return false;
  const hay = normalize(haystack);
  if (hay.includes(needle)) return true;
  // Fuzzy fallback: first 4 long-ish words must appear consecutively.
  const words = needle.split(" ").filter((w) => w.length > 2);
  if (words.length >= 4 && hay.includes(words.slice(0, 4).join(" "))) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authorize: accept service-role bearer (cron) or admin user JWT.
  // The cron schedule passes the anon key as bearer; we accept that too
  // since this function only mutates events.verification_* fields and is
  // safe to re-trigger.
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = bearer && (bearer === serviceKey || bearer === anonKey);
  let triggeredBy = "cron";

  if (!authorized && bearer) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) {
        authorized = true;
        triggeredBy = `admin:${user.id}`;
      }
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Open a run row.
  const { data: runRow, error: runErr } = await supabase
    .from("reverification_runs")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select("id")
    .single();
  if (runErr || !runRow) {
    return new Response(JSON.stringify({ error: runErr?.message ?? "run insert failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const runId = runRow.id;

  const today = new Date().toISOString().slice(0, 10);
  const refreshCutoff = new Date(Date.now() - STALE_REFRESH_HOURS * 3600_000).toISOString();

  // Candidates: upcoming events with a source URL, not verified recently.
  const { data: candidates, error: selErr } = await supabase
    .from("events")
    .select("id, title, source_url, source_quote, verification_status, last_verified_at")
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
    return new Response(JSON.stringify({ error: selErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    let newStatus: "verified" | "stale" | "missing" | "unverified" = ev.verification_status as
      | "verified" | "stale" | "missing" | "unverified";
    let notes: string | null = null;

    if (!ev.source_quote) {
      // Cannot verify without an anchor quote. Just touch timestamp.
      newStatus = "unverified";
      notes = "No source_quote on record";
    } else {
      try {
        let text = pageCache.get(url) ?? null;
        if (text === null && !pageCache.has(url)) {
          try {
            if (firecrawlKey && shouldUseFirecrawl(url)) {
              text = await fetchViaFirecrawl(url, firecrawlKey);
            } else {
              text = await fetchPageText(url);
              if ((text?.length ?? 0) < 300 && firecrawlKey) {
                text = await fetchViaFirecrawl(url, firecrawlKey);
              }
            }
          } catch (e) {
            text = null;
            notes = `Fetch failed: ${e instanceof Error ? e.message : String(e)}`;
          }
          pageCache.set(url, text);
        }

        if (!text) {
          newStatus = "missing";
          notes = notes ?? "Source page unreachable";
          flagged++;
        } else if (quoteFound(ev.source_quote as string, text)) {
          newStatus = "verified";
          notes = null;
          verified++;
        } else {
          newStatus = "stale";
          notes = "source_quote no longer present on source page";
          flagged++;
        }
      } catch (e) {
        errors.push({
          event_id: ev.id as string,
          message: e instanceof Error ? e.message : String(e),
        });
        continue;
      }
    }

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

  return new Response(
    JSON.stringify({
      ok: true,
      run_id: runId,
      checked,
      verified,
      flagged,
      errors_count: errors.length,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
