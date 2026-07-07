// Nightly region content audit. Computes thin/duplicate signals for each
// /paintball/<region> page and stores the run in `region_audit_runs`.
// Triggered by pg_cron; also callable on demand by admins.

import { adminClient, authorizeAdminOrCron, readEnv } from "../_shared/supabase.ts";
import { errors, json, preflight } from "../_shared/http.ts";

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
interface IndexStatus {
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  lastCrawlTime: string | null;
  error: string | null;
}
interface Row {
  slug: string; name: string; url: string;
  venueCount: number; upcomingCount: number;
  introWords: number; totalWords: number;
  duplicationScore: number; // 0..1, max Jaccard vs any other region intro
  indexStatus: IndexStatus | null;
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

const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://findawalkon.com/";

async function fetchIndexStatus(lovableKey: string, gscKey: string, url: string): Promise<IndexStatus> {
  try {
    const res = await fetch(`${GSC_GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
    });
    if (!res.ok) {
      return { verdict: null, coverageState: null, indexingState: null, lastCrawlTime: null, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const idx = data?.inspectionResult?.indexStatusResult ?? {};
    return {
      verdict: idx.verdict ?? null,
      coverageState: idx.coverageState ?? null,
      indexingState: idx.indexingState ?? null,
      lastCrawlTime: idx.lastCrawlTime ?? null,
      error: null,
    };
  } catch (e) {
    return { verdict: null, coverageState: null, indexingState: null, lastCrawlTime: null, error: e instanceof Error ? e.message : String(e) };
  }
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

  // Pull region overrides so post-fix metrics reflect the new copy.
  const { data: overrides } = await admin
    .from("region_content_overrides")
    .select("slug,intro,extra_cities,extra_copy");
  const overrideBySlug = new Map<string, { intro?: string; extra_cities?: string[]; extra_copy?: string }>();
  for (const o of overrides ?? []) {
    overrideBySlug.set((o as { slug: string }).slug, o as { intro?: string; extra_cities?: string[]; extra_copy?: string });
  }

  // Effective region content (base + override).
  const effective = REGIONS.map((r) => {
    const ov = overrideBySlug.get(r.slug);
    const intro = (ov?.intro && ov.intro.trim().length > 0) ? ov.intro : r.intro;
    const cities = Array.from(new Set([...r.cities, ...((ov?.extra_cities ?? []) as string[])]));
    const extraCopy = ov?.extra_copy ?? "";
    return { ...r, intro, cities, extraCopy };
  });

  const tokens = new Map<string, string[]>();
  effective.forEach((r) => tokens.set(r.slug, tokenize(`${r.intro} ${r.extraCopy}`)));

  // Pre-compute pairwise jaccard for duplication scores.
  const dupScore = new Map<string, number>();
  for (let i = 0; i < effective.length; i++) {
    let best = 0;
    for (let j = 0; j < effective.length; j++) {
      if (i === j) continue;
      const sim = jaccard(tokens.get(effective[i].slug)!, tokens.get(effective[j].slug)!);
      if (sim > best) best = sim;
    }
    dupScore.set(effective[i].slug, best);
  }

  const rows: Row[] = effective.map((region) => {
    const venueRows = venuesByRegion.get(region.name) ?? [];
    const venueCount = venueRows.length;
    const upcomingCount = venueRows.reduce((s, v) => s + (upcomingByVenue.get(v.name) ?? 0), 0);
    const introWords = tokenize(region.intro).length;
    const cityWords = region.cities.join(" ").split(/\s+/).length;
    const venueWords = venueRows.reduce((s, v) => s + v.name.split(/\s+/).length, 0);
    const extraWords = region.extraCopy ? tokenize(region.extraCopy).length : 0;
    const totalWords = introWords + cityWords + venueWords + extraWords;
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
      duplicationScore: Number((dupScore.get(region.slug) ?? 0).toFixed(3)),
      indexStatus: null,
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
      const overlap = effective[i].cities.filter((c) => effective[j].cities.includes(c));
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

  // Best-effort GSC indexing fetch for all region URLs in parallel.
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (lovableKey && gscKey) {
    const statuses = await Promise.all(rows.map((r) => fetchIndexStatus(lovableKey, gscKey, r.url)));
    rows.forEach((r, i) => { r.indexStatus = statuses[i]; });
  }

  const summary = rows.reduce((acc, r) => { acc[r.worstSeverity]++; return acc; }, { ok: 0, warn: 0, fail: 0 });
  const fingerprint = rows
    .flatMap((r) => r.issues.map((i) => `${r.slug}:${i.code}`))
    .sort()
    .join("|");
  return { rows, summary, fingerprint };
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const env = readEnv();
  if (!env) return errors.missingEnv();

  const auth = await authorizeAdminOrCron(req, env);
  if (!auth.ok) return auth.response;

  const admin = adminClient(env);
  const triggeredBy = auth.triggeredBy;

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

    return json({
      runId: (inserted as { id: string }).id,
      createdAt: (inserted as { created_at: string }).created_at,
      summary: result.summary,
      fingerprint: result.fingerprint,
      triggeredBy,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
});
