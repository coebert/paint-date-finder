// Nightly region content audit. Computes thin/duplicate signals for each
// /paintball/<region> page and stores the run in `region_audit_runs`.
// Triggered by pg_cron; also callable on demand by admins.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface RegionMeta {
  name: string;
  slug: string;
  intro: string;
  cities: string[];
}

// Keep in sync with src/lib/regions.ts
const REGIONS: RegionMeta[] = [
  { name: "South East", slug: "south-east", intro: "Paintball venues across the South East of England — including London, Surrey, Kent, Sussex and Hampshire. Browse upcoming walk-on days, scenario games and tournaments at the region's busiest fields.", cities: ["London", "Surrey", "Kent", "Sussex", "Hampshire", "Berkshire"] },
  { name: "South West", slug: "south-west", intro: "Walk-on paintball events across the South West — Bristol, Somerset, Devon, Cornwall and Wiltshire. Find your next game and book a spot directly with the venue.", cities: ["Bristol", "Somerset", "Devon", "Cornwall", "Wiltshire", "Dorset"] },
  { name: "West Midlands", slug: "west-midlands", intro: "Paintball walk-ons across the West Midlands — Birmingham, Coventry, Wolverhampton, Worcestershire and beyond. Mag-fed, mechanical and speedball events listed daily.", cities: ["Birmingham", "Coventry", "Wolverhampton", "Worcestershire", "Warwickshire"] },
  { name: "East Midlands", slug: "east-midlands", intro: "Walk-on paintball events across the East Midlands — Nottingham, Leicester, Derby, Lincolnshire and Northamptonshire. Verified dates, prices and booking links.", cities: ["Nottingham", "Leicester", "Derby", "Lincolnshire", "Northamptonshire"] },
  { name: "North West", slug: "north-west", intro: "Paintball in the North West — Manchester, Liverpool, Lancashire and Cumbria. Find walk-on days, big games and CPPS league fixtures near you.", cities: ["Manchester", "Liverpool", "Lancashire", "Cumbria", "Cheshire"] },
  { name: "North East", slug: "north-east", intro: "Walk-on paintball events across the North East — Newcastle, Sunderland, Durham and Tyne & Wear.", cities: ["Newcastle", "Sunderland", "Durham", "Tyne and Wear"] },
  { name: "Yorkshire", slug: "yorkshire", intro: "Yorkshire paintball walk-ons — Leeds, Sheffield, Bradford, York and Hull. Browse upcoming events, prices and booking links from verified venues.", cities: ["Leeds", "Sheffield", "Bradford", "York", "Hull"] },
  { name: "Scotland", slug: "scotland", intro: "Paintball venues across Scotland — Glasgow, Edinburgh and the central belt. Find walk-on days and book a spot.", cities: ["Glasgow", "Edinburgh", "Stirling", "Aberdeen"] },
  { name: "Wales", slug: "wales", intro: "Walk-on paintball events across Wales — Cardiff, Swansea, Newport and the South Wales valleys.", cities: ["Cardiff", "Swansea", "Newport"] },
];

const THIN_INTRO_WORDS = 25;
const LOW_TOTAL_WORDS = 120;
const FEW_VENUES = 3;
const FEW_UPCOMING = 2;
const FEW_CITIES = 3;
const DUPLICATE_JACCARD = 0.55;
const CITY_OVERLAP_MIN = 2;

type Severity = "ok" | "warn" | "fail";
interface Issue { severity: Severity; code: string; message: string; suggestion: string }
interface Row {
  slug: string; name: string; url: string;
  venueCount: number; upcomingCount: number;
  introWords: number; totalWords: number;
  worstSeverity: Severity; issues: Issue[];
  duplicatePartners: string[];
  cityOverlapPartners: { region: string; cities: string[] }[];
}

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}
function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  let inter = 0; A.forEach((t) => { if (B.has(t)) inter++; });
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}
function worstOf(issues: Issue[]): Severity {
  if (issues.some((i) => i.severity === "fail")) return "fail";
  if (issues.some((i) => i.severity === "warn")) return "warn";
  return "ok";
}

async function runAudit(admin: ReturnType<typeof createClient>) {
  const { data: venues, error: vErr } = await admin
    .from("venues").select("id,name,region").not("region", "is", null);
  if (vErr) throw vErr;
  const venuesByRegion = new Map<string, { name: string }[]>();
  for (const v of venues ?? []) {
    const r = (v as { region: string }).region;
    if (!venuesByRegion.has(r)) venuesByRegion.set(r, []);
    venuesByRegion.get(r)!.push({ name: (v as { name: string }).name });
  }
  const today = new Date().toISOString().slice(0, 10);
  const { data: events, error: eErr } = await admin
    .from("events").select("venue_name,event_date,is_verified")
    .gte("event_date", today).eq("is_verified", true);
  if (eErr) throw eErr;
  const upcomingByVenue = new Map<string, number>();
  for (const e of events ?? []) {
    const v = (e as { venue_name: string }).venue_name;
    upcomingByVenue.set(v, (upcomingByVenue.get(v) ?? 0) + 1);
  }

  const tokens = new Map<string, string[]>();
  REGIONS.forEach((r) => tokens.set(r.slug, tokenize(r.intro)));

  const rows: Row[] = REGIONS.map((region) => {
    const venueRows = venuesByRegion.get(region.name) ?? [];
    const venueCount = venueRows.length;
    const upcomingCount = venueRows.reduce((s, v) => s + (upcomingByVenue.get(v.name) ?? 0), 0);
    const introWords = tokenize(region.intro).length;
    const cityWords = region.cities.join(" ").split(/\s+/).length;
    const venueWords = venueRows.reduce((s, v) => s + v.name.split(/\s+/).length, 0);
    const totalWords = introWords + cityWords + venueWords;
    const issues: Issue[] = [];

    if (introWords < THIN_INTRO_WORDS) issues.push({ severity: "warn", code: "thin_intro", message: `Intro is only ${introWords} words (target ≥${THIN_INTRO_WORDS}).`, suggestion: "Expand the intro with local scene specifics, popular formats, or travel notes." });
    if (venueCount === 0) issues.push({ severity: "fail", code: "no_venues", message: "No verified venues attached to this region.", suggestion: "Add at least one verified venue with region set." });
    else if (venueCount < FEW_VENUES) issues.push({ severity: "warn", code: "few_venues", message: `Only ${venueCount} venue${venueCount === 1 ? "" : "s"} listed.`, suggestion: "Add more verified venues or merge with a neighbouring region." });
    if (upcomingCount < FEW_UPCOMING) issues.push({ severity: "warn", code: "few_upcoming_events", message: `Only ${upcomingCount} upcoming verified event${upcomingCount === 1 ? "" : "s"}.`, suggestion: "Encourage local venues to submit walk-on dates." });
    if (totalWords < LOW_TOTAL_WORDS) issues.push({ severity: "warn", code: "low_word_count", message: `Total visible content ~${totalWords} words — likely thin.`, suggestion: "Add a short FAQ block or local-area copy to push past ~250 words." });
    if (region.cities.length < FEW_CITIES) issues.push({ severity: "warn", code: "few_cities", message: `Only ${region.cities.length} cities/areas listed.`, suggestion: "Add 2–3 more city/area chips in src/lib/regions.ts." });

    return {
      slug: region.slug, name: region.name, url: `https://findawalkon.com/paintball/${region.slug}`,
      venueCount, upcomingCount, introWords, totalWords,
      worstSeverity: "ok" as Severity, issues, duplicatePartners: [], cityOverlapPartners: [],
    };
  });

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      const sim = jaccard(tokens.get(a.slug)!, tokens.get(b.slug)!);
      if (sim >= DUPLICATE_JACCARD) {
        a.duplicatePartners.push(b.name);
        b.duplicatePartners.push(a.name);
      }
      const overlap = REGIONS[i].cities.filter((c) => REGIONS[j].cities.includes(c));
      if (overlap.length >= CITY_OVERLAP_MIN) {
        a.cityOverlapPartners.push({ region: b.name, cities: overlap });
        b.cityOverlapPartners.push({ region: a.name, cities: overlap });
      }
    }
  }
  for (const row of rows) {
    if (row.duplicatePartners.length) row.issues.push({ severity: "fail", code: "duplicate_intro", message: `Intro highly similar to: ${row.duplicatePartners.join(", ")}.`, suggestion: "Rewrite this region's intro with location-specific phrasing." });
    if (row.cityOverlapPartners.length) row.issues.push({ severity: "warn", code: "overlapping_cities", message: `City list overlaps with: ${row.cityOverlapPartners.map((p) => `${p.region} (${p.cities.join(", ")})`).join("; ")}.`, suggestion: "Move shared cities to whichever region they geographically belong to." });
    row.worstSeverity = worstOf(row.issues);
  }

  const summary = rows.reduce((acc, r) => { acc[r.worstSeverity]++; return acc; }, { ok: 0, warn: 0, fail: 0 });
  // Fingerprint: sorted region:issueCode list — changes whenever any issue appears/disappears.
  const fingerprint = rows
    .flatMap((r) => r.issues.map((i) => `${r.slug}:${i.code}`))
    .sort()
    .join("|");
  return { rows, summary, fingerprint };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Determine trigger source — admin user, cron (no auth), or anyone else.
  let triggeredBy = "cron";
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (bearer && bearer !== anonKey) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    triggeredBy = `admin:${user.id}`;
  }

  try {
    const result = await runAudit(admin);
    const { data: inserted, error: insErr } = await admin
      .from("region_audit_runs")
      .insert({
        fail_count: result.summary.fail,
        warn_count: result.summary.warn,
        ok_count: result.summary.ok,
        fingerprint: result.fingerprint,
        rows: result.rows,
        triggered_by: triggeredBy,
      })
      .select("id, created_at")
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        runId: (inserted as { id: string }).id,
        createdAt: (inserted as { created_at: string }).created_at,
        summary: result.summary,
        fingerprint: result.fingerprint,
        triggeredBy,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
