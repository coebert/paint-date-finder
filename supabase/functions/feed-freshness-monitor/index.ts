// Daily feed freshness monitor.
// Checks for stale event feed signals and emails an alert via Resend
// when thresholds are crossed. Triggered by pg_cron daily.
//
// Thresholds:
//   - SCRAPE_STALE_HOURS: no successful scrape_runs row within this window.
//   - UPDATE_STALE_HOURS: no events.updated_at within this window.
//   - STALE_EVENT_DAYS:   any event whose updated_at is older than this counts as stale.
//
// Dedupe: if the previous snapshot already alerted and the current
// stale flags are the same, we skip the email (so admins get one email
// per incident, not daily noise).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SCRAPE_STALE_HOURS = 72;   // 3 days
const UPDATE_STALE_HOURS = 168;  // 7 days
const STALE_EVENT_DAYS = 60;
const ALERT_RECIPIENT = "coebert@gmail.com";
const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const SITE = "https://findawalkon.com";

async function sendAlertEmail(
  lovableKey: string,
  resendKey: string,
  reasons: string[],
  snapshot: Record<string, unknown>,
) {
  const html = `
    <h2 style="font-family:Arial,sans-serif;color:#0f1b3d;">Event feed is going stale</h2>
    <p style="font-family:Arial,sans-serif;color:#333;">
      The freshness monitor for <a href="${SITE}">findawalkon.com</a> flagged:
    </p>
    <ul style="font-family:Arial,sans-serif;color:#333;">
      ${reasons.map((r) => `<li>${r}</li>`).join("")}
    </ul>
    <h3 style="font-family:Arial,sans-serif;color:#0f1b3d;margin-top:24px;">Snapshot</h3>
    <pre style="background:#f4f4f4;padding:12px;border-radius:6px;font-size:12px;">${JSON.stringify(snapshot, null, 2)}</pre>
    <p style="font-family:Arial,sans-serif;color:#666;font-size:12px;">
      Review and trigger a re-scrape from Admin &rarr; Scraper.
    </p>
  `;

  const res = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "Find A Walk-On <onboarding@resend.dev>",
      to: [ALERT_RECIPIENT],
      subject: `[Freshness Alert] Event feed stale on findawalkon.com`,
      html,
    }),
  });

  if (!res.ok) {
    console.error("resend failed", res.status, await res.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!lovableKey || !resendKey || !supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Missing required env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Accept either the service-role key (pg_cron) or a signed-in admin user JWT.
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = bearer && bearer === serviceKey;

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
      authorized = !!roleRow;
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const now = new Date();

    // Last successful scrape.
    const { data: scrape } = await supabase
      .from("scrape_runs")
      .select("finished_at, started_at, status")
      .eq("status", "success")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastScrapeAt: string | null = scrape?.finished_at ?? scrape?.started_at ?? null;

    // Most recent event update.
    const { data: latestEvent } = await supabase
      .from("events")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastEventUpdateAt: string | null = latestEvent?.updated_at ?? null;

    // Count stale events (updated_at older than threshold).
    const staleCutoff = new Date(now.getTime() - STALE_EVENT_DAYS * 24 * 3600 * 1000).toISOString();
    const { count: staleCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .lt("updated_at", staleCutoff);

    const scrapeAgeHrs = lastScrapeAt
      ? (now.getTime() - new Date(lastScrapeAt).getTime()) / 3600000
      : Infinity;
    const updateAgeHrs = lastEventUpdateAt
      ? (now.getTime() - new Date(lastEventUpdateAt).getTime()) / 3600000
      : Infinity;

    const scrapeStale = scrapeAgeHrs > SCRAPE_STALE_HOURS;
    const updatesStale = updateAgeHrs > UPDATE_STALE_HOURS;

    const reasons: string[] = [];
    if (scrapeStale) {
      reasons.push(
        `<strong>No successful scrape</strong> in the last ${Math.round(scrapeAgeHrs)} hour(s) (threshold: ${SCRAPE_STALE_HOURS}h).`,
      );
    }
    if (updatesStale) {
      reasons.push(
        `<strong>No event has been updated</strong> in the last ${Math.round(updateAgeHrs)} hour(s) (threshold: ${UPDATE_STALE_HOURS}h).`,
      );
    }

    // Dedupe vs last snapshot.
    const { data: prev } = await supabase
      .from("freshness_snapshots")
      .select("alert_sent, scrape_stale, updates_stale")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stillSameIncident =
      prev?.alert_sent === true &&
      prev.scrape_stale === scrapeStale &&
      prev.updates_stale === updatesStale;

    let alertSent = false;
    const snapshotRow = {
      last_successful_scrape_at: lastScrapeAt,
      last_event_update_at: lastEventUpdateAt,
      stale_event_count: staleCount ?? 0,
      scrape_stale: scrapeStale,
      updates_stale: updatesStale,
      details: { scrapeAgeHrs, updateAgeHrs, thresholds: { SCRAPE_STALE_HOURS, UPDATE_STALE_HOURS, STALE_EVENT_DAYS } },
    };

    if (reasons.length > 0 && !stillSameIncident) {
      alertSent = await sendAlertEmail(lovableKey, resendKey, reasons, snapshotRow);
    }

    const { error } = await supabase
      .from("freshness_snapshots")
      .insert({ ...snapshotRow, alert_sent: alertSent || stillSameIncident });

    if (error) {
      console.error("freshness insert failed", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, alert_sent: alertSent, ...snapshotRow }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("feed-freshness-monitor error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
