// Daily SEO regression monitor.
// Pulls Google Search Console sitemap status + Search Analytics totals,
// stores a snapshot in `public.seo_snapshots`, and emails an alert via
// Resend if regressions cross thresholds.
//
// Triggered by pg_cron daily at 06:00 UTC. Also invokable manually by admins.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SITE = "https://findawalkon.com/";
const SITE_ENC = encodeURIComponent(SITE);
const SITEMAP_URL = `${SITE}sitemap.xml`;
const SITEMAP_ENC = encodeURIComponent(SITEMAP_URL);
const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";

// Regression thresholds.
const INDEXED_DROP_PCT = 0.20;       // 20% drop in indexed URLs.
const CLICKS_DROP_PCT = 0.50;        // 50% drop in 7d clicks.
const TOP_ITEM_DROP_PCT = 0.50;      // 50% drop on a top query/page.
const ALERT_RECIPIENT = "coebert@gmail.com";

interface SitemapStatus {
  path: string;
  submitted: number;
  indexed: number;
  errors: number;
  warnings: number;
  lastDownloaded: string | null;
}

interface SearchTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function fetchSitemap(lovableKey: string, gscKey: string): Promise<SitemapStatus | null> {
  const res = await fetch(
    `${GSC_GATEWAY}/webmasters/v3/sites/${SITE_ENC}/sitemaps/${SITEMAP_ENC}`,
    {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gscKey },
    },
  );
  if (!res.ok) {
    console.error("sitemap fetch failed", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const submitted = Number(data?.contents?.[0]?.submitted ?? 0);
  const indexed = Number(data?.contents?.[0]?.indexed ?? 0);
  return {
    path: data?.path ?? SITEMAP_URL,
    submitted,
    indexed,
    errors: Number(data?.errors ?? 0),
    warnings: Number(data?.warnings ?? 0),
    lastDownloaded: data?.lastDownloaded ?? null,
  };
}

async function fetchSearchAnalytics(
  lovableKey: string,
  gscKey: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = [],
  rowLimit = 1,
): Promise<SearchTotals | null> {
  const body = { startDate, endDate, dimensions, rowLimit };
  const res = await fetch(
    `${GSC_GATEWAY}/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    console.error("searchAnalytics failed", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const rows = data?.rows ?? [];
  const totals = rows.reduce(
    (acc: { clicks: number; impressions: number }, r: { clicks: number; impressions: number }) => {
      acc.clicks += Number(r.clicks ?? 0);
      acc.impressions += Number(r.impressions ?? 0);
      return acc;
    },
    { clicks: 0, impressions: 0 },
  );
  // For totals query (no dimensions) GSC returns one row already aggregated.
  if (dimensions.length === 0 && rows.length === 1) {
    return {
      clicks: Number(rows[0].clicks ?? 0),
      impressions: Number(rows[0].impressions ?? 0),
      ctr: Number(rows[0].ctr ?? 0),
      position: Number(rows[0].position ?? 0),
      rows,
    };
  }
  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  return { clicks: totals.clicks, impressions: totals.impressions, ctr, position: 0, rows };
}

async function sendAlertEmail(
  lovableKey: string,
  resendKey: string,
  regressions: Array<{ kind: string; message: string }>,
  snapshot: Record<string, unknown>,
) {
  const html = `
    <h2 style="font-family:Arial,sans-serif;color:#0f1b3d;">SEO regression detected</h2>
    <p style="font-family:Arial,sans-serif;color:#333;">
      The daily SEO monitor for <a href="${SITE}">findawalkon.com</a> flagged the following:
    </p>
    <ul style="font-family:Arial,sans-serif;color:#333;">
      ${regressions.map((r) => `<li><strong>${r.kind}:</strong> ${r.message}</li>`).join("")}
    </ul>
    <h3 style="font-family:Arial,sans-serif;color:#0f1b3d;margin-top:24px;">Snapshot</h3>
    <pre style="background:#f4f4f4;padding:12px;border-radius:6px;font-size:12px;">${JSON.stringify(snapshot, null, 2)}</pre>
    <p style="font-family:Arial,sans-serif;color:#666;font-size:12px;">
      Review trends in Admin &rarr; SEO Monitor.
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
      subject: `[SEO Alert] ${regressions.length} regression${regressions.length === 1 ? "" : "s"} on findawalkon.com`,
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
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!lovableKey || !gscKey || !resendKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing required env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Fetch sitemap status.
    const sitemap = await fetchSitemap(lovableKey, gscKey);

    // 2) Fetch 7d totals (GSC delays data ~3 days, so window is days 10..3 ago).
    const endDate = isoDaysAgo(3);
    const startDate = isoDaysAgo(10);
    const prevEnd = isoDaysAgo(11);
    const prevStart = isoDaysAgo(18);

    const totals = await fetchSearchAnalytics(lovableKey, gscKey, startDate, endDate);
    const queries = await fetchSearchAnalytics(lovableKey, gscKey, startDate, endDate, ["query"], 10);
    const pages = await fetchSearchAnalytics(lovableKey, gscKey, startDate, endDate, ["page"], 10);

    // 3) Pull previous snapshot for comparison.
    const { data: prevSnap } = await supabase
      .from("seo_snapshots")
      .select("sitemap_indexed, total_clicks, top_queries, top_pages")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevTotals = await fetchSearchAnalytics(lovableKey, gscKey, prevStart, prevEnd);

    // 4) Detect regressions.
    const regressions: Array<{ kind: string; message: string }> = [];

    if (prevSnap?.sitemap_indexed && sitemap && sitemap.indexed > 0) {
      const dropPct = (prevSnap.sitemap_indexed - sitemap.indexed) / prevSnap.sitemap_indexed;
      if (dropPct >= INDEXED_DROP_PCT) {
        regressions.push({
          kind: "Indexed URLs dropped",
          message: `Indexed URLs fell from ${prevSnap.sitemap_indexed} to ${sitemap.indexed} (${(dropPct * 100).toFixed(1)}% drop).`,
        });
      }
    }

    if (sitemap && sitemap.errors > 0) {
      regressions.push({
        kind: "Sitemap errors",
        message: `Google reports ${sitemap.errors} sitemap errors.`,
      });
    }

    if (prevTotals && totals && prevTotals.clicks > 10) {
      const dropPct = (prevTotals.clicks - totals.clicks) / prevTotals.clicks;
      if (dropPct >= CLICKS_DROP_PCT) {
        regressions.push({
          kind: "Search clicks dropped",
          message: `7d clicks fell from ${prevTotals.clicks} to ${totals.clicks} (${(dropPct * 100).toFixed(1)}% drop vs prior 7d).`,
        });
      }
    }

    // Per-query regressions: compare top-10 to previous snapshot's top_queries.
    const prevQueryMap = new Map<string, number>(
      (prevSnap?.top_queries as Array<{ key: string; clicks: number }> | undefined)?.map((q) => [q.key, q.clicks]) ?? [],
    );
    for (const row of queries?.rows ?? []) {
      const key = row.keys[0];
      const prevClicks = prevQueryMap.get(key);
      if (prevClicks && prevClicks >= 5) {
        const dropPct = (prevClicks - row.clicks) / prevClicks;
        if (dropPct >= TOP_ITEM_DROP_PCT) {
          regressions.push({
            kind: "Top query lost clicks",
            message: `"${key}": ${prevClicks} → ${row.clicks} clicks (${(dropPct * 100).toFixed(0)}% drop).`,
          });
        }
      }
    }

    // 5) Persist snapshot.
    const topQueries = (queries?.rows ?? []).map((r) => ({
      key: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    }));
    const topPages = (pages?.rows ?? []).map((r) => ({
      key: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    }));

    const snapshotRow = {
      sitemap_path: sitemap?.path ?? null,
      sitemap_submitted: sitemap?.submitted ?? null,
      sitemap_indexed: sitemap?.indexed ?? null,
      sitemap_errors: sitemap?.errors ?? null,
      sitemap_warnings: sitemap?.warnings ?? null,
      sitemap_last_downloaded: sitemap?.lastDownloaded ?? null,
      total_clicks: totals?.clicks ?? null,
      total_impressions: totals?.impressions ?? null,
      avg_ctr: totals?.ctr ?? null,
      avg_position: totals?.position ?? null,
      top_queries: topQueries,
      top_pages: topPages,
      regressions,
      alert_sent: false,
      raw: { window: { startDate, endDate }, prevWindow: { prevStart, prevEnd } },
    };

    let alertSent = false;
    if (regressions.length > 0) {
      alertSent = await sendAlertEmail(lovableKey, resendKey, regressions, snapshotRow);
    }

    const { error: insertError } = await supabase
      .from("seo_snapshots")
      .insert({ ...snapshotRow, alert_sent: alertSent });

    if (insertError) {
      console.error("snapshot insert failed", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        regressions: regressions.length,
        alert_sent: alertSent,
        snapshot: snapshotRow,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("seo-monitor error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
