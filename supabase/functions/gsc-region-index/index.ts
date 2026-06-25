// Inspects Google Search Console indexing status for the region landing pages.
// Admin-only. Returns per-URL coverage + indexing verdict so the admin dashboard
// can flag errors / warnings.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SITE = "https://findawalkon.com/";
const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

interface InspectResult {
  url: string;
  label: string;
  verdict: string | null;          // PASS, PARTIAL, FAIL, NEUTRAL
  coverageState: string | null;    // human-readable coverage
  indexingState: string | null;    // INDEXING_ALLOWED, BLOCKED_BY_*
  lastCrawlTime: string | null;
  pageFetchState: string | null;
  robotsTxtState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  referringUrls: string[] | null;
  mobileVerdict: string | null;
  richResultsVerdict: string | null;
  error: string | null;
}

async function inspectUrl(
  lovableKey: string,
  gscKey: string,
  inspectionUrl: string,
  label: string,
): Promise<InspectResult> {
  const base: InspectResult = {
    url: inspectionUrl,
    label,
    verdict: null,
    coverageState: null,
    indexingState: null,
    lastCrawlTime: null,
    pageFetchState: null,
    robotsTxtState: null,
    googleCanonical: null,
    userCanonical: null,
    referringUrls: null,
    mobileVerdict: null,
    richResultsVerdict: null,
    error: null,
  };
  try {
    const res = await fetch(`${GSC_GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl, siteUrl: SITE }),
    });
    if (!res.ok) {
      return { ...base, error: `HTTP ${res.status}: ${await res.text()}` };
    }
    const data = await res.json();
    const idx = data?.inspectionResult?.indexStatusResult ?? {};
    const mob = data?.inspectionResult?.mobileUsabilityResult ?? {};
    const rich = data?.inspectionResult?.richResultsResult ?? {};
    return {
      ...base,
      verdict: idx.verdict ?? null,
      coverageState: idx.coverageState ?? null,
      indexingState: idx.indexingState ?? null,
      lastCrawlTime: idx.lastCrawlTime ?? null,
      pageFetchState: idx.pageFetchState ?? null,
      robotsTxtState: idx.robotsTxtState ?? null,
      googleCanonical: idx.googleCanonical ?? null,
      userCanonical: idx.userCanonical ?? null,
      referringUrls: idx.referringUrls ?? null,
      mobileVerdict: mob.verdict ?? null,
      richResultsVerdict: rich.verdict ?? null,
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!lovableKey || !gscKey || !supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Missing required env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admin auth.
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = false;
  if (bearer) {
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

  let body: { urls?: Array<{ url: string; label: string }> } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const urls = Array.isArray(body.urls) ? body.urls.slice(0, 30) : [];
  if (urls.length === 0) {
    return new Response(JSON.stringify({ error: "Provide a non-empty `urls` array" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: InspectResult[] = [];
  // Run sequentially to be polite to the GSC quota.
  for (const { url, label } of urls) {
    if (typeof url !== "string" || !url.startsWith("https://findawalkon.com/")) {
      results.push({
        url: String(url),
        label: String(label ?? ""),
        verdict: null,
        coverageState: null,
        indexingState: null,
        lastCrawlTime: null,
        pageFetchState: null,
        robotsTxtState: null,
        googleCanonical: null,
        userCanonical: null,
        referringUrls: null,
        mobileVerdict: null,
        richResultsVerdict: null,
        error: "Only findawalkon.com URLs are allowed",
      });
      continue;
    }
    results.push(await inspectUrl(lovableKey, gscKey, url, String(label ?? url)));
  }

  return new Response(
    JSON.stringify({ checkedAt: new Date().toISOString(), results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
