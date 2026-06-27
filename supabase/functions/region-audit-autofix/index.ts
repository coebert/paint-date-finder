// Auto-fixes thin/duplicate region landing-page content by generating a
// region-specific intro + extra city tags + extra prose via Lovable AI, and
// upserting into `region_content_overrides`. Admin-only.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface RegionMeta { name: string; slug: string; intro: string; cities: string[] }

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

interface StoredIssue { code: string }
interface StoredRow { slug: string; issues: StoredIssue[] }

const AUTOFIXABLE_CODES = new Set([
  "thin_intro",
  "low_word_count",
  "few_cities",
  "duplicate_intro",
  "overlapping_cities",
]);

async function generateForRegion(
  region: RegionMeta,
  forbiddenCities: string[],
  apiKey: string,
): Promise<{ intro: string; extra_cities: string[]; extra_copy: string } | null> {
  const prompt = `You are writing SEO copy for a UK paintball directory page covering the ${region.name} region.

Existing intro (rewrite uniquely, do not copy phrasing):
"${region.intro}"

Already-listed cities/areas: ${region.cities.join(", ")}
Cities used by OTHER regions (do NOT reuse): ${forbiddenCities.join(", ") || "(none)"}

Return STRICT JSON with this shape (no markdown, no commentary):
{
  "intro": "65-90 word region-specific intro paragraph in British English. Mention notable local fields/terrain/scene character if known. Avoid generic phrasing shared with other UK regions. Must read naturally, not keyword-stuffed.",
  "extra_cities": ["3 to 5 additional UK city or county names within ${region.name} that are NOT already listed and NOT in the forbidden list"],
  "extra_copy": "A short FAQ-style paragraph (80-120 words) covering typical costs, age limits, paint formats (mechanical / mag-fed / speedball) and travel notes specific to ${region.name}. British English."
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You write concise, location-specific SEO copy for UK paintball pages. You always return valid JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway ${response.status}: ${text.slice(0, 200)}`);
  }
  const json = await response.json() as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
  // Strip code fences if the model wrapped output.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  let parsed: { intro?: string; extra_cities?: unknown; extra_copy?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const intro = typeof parsed.intro === "string" ? parsed.intro.trim() : "";
  const extra_copy = typeof parsed.extra_copy === "string" ? parsed.extra_copy.trim() : "";
  const extra_cities = Array.isArray(parsed.extra_cities)
    ? parsed.extra_cities
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.length < 60 && !region.cities.includes(c) && !forbiddenCities.includes(c))
        .slice(0, 5)
    : [];
  if (!intro) return null;
  return { intro, extra_cities, extra_copy };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey || !aiKey) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: must be a signed-in admin.
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!bearer || bearer === anonKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roleRow } = await admin
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Read latest audit run to know which regions need fixing.
    const { data: runRow, error: runErr } = await admin
      .from("region_audit_runs")
      .select("rows")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (runErr) throw runErr;
    const rows: StoredRow[] = ((runRow?.rows as unknown) as StoredRow[]) ?? [];
    const slugsNeedingFix = new Set(
      rows
        .filter((r) => r.issues.some((i) => AUTOFIXABLE_CODES.has(i.code)))
        .map((r) => r.slug),
    );

    // Optional: caller may pass { slugs: [...] } to scope, or {} to do all.
    let scope: Set<string> = slugsNeedingFix;
    try {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.slugs) && body.slugs.length > 0) {
        scope = new Set(body.slugs.filter((s: unknown): s is string => typeof s === "string"));
      }
    } catch { /* ignore */ }

    const targets = REGIONS.filter((r) => scope.has(r.slug));
    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ fixed: 0, message: "No regions need fixing." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cities used by OTHER regions — used to discourage overlap.
    const cityToRegions = new Map<string, string[]>();
    for (const r of REGIONS) {
      for (const c of r.cities) {
        if (!cityToRegions.has(c)) cityToRegions.set(c, []);
        cityToRegions.get(c)!.push(r.name);
      }
    }

    const fixed: string[] = [];
    const skipped: { slug: string; reason: string }[] = [];

    for (const region of targets) {
      const forbidden = Array.from(cityToRegions.entries())
        .filter(([, regs]) => !regs.includes(region.name))
        .map(([city]) => city);
      try {
        const result = await generateForRegion(region, forbidden, aiKey);
        if (!result) {
          skipped.push({ slug: region.slug, reason: "AI returned invalid JSON" });
          continue;
        }
        const { error: upErr } = await admin
          .from("region_content_overrides")
          .upsert({
            slug: region.slug,
            intro: result.intro,
            extra_cities: result.extra_cities,
            extra_copy: result.extra_copy,
            generated_by: `admin:${user.id}`,
            updated_at: new Date().toISOString(),
          }, { onConflict: "slug" });
        if (upErr) {
          skipped.push({ slug: region.slug, reason: upErr.message });
          continue;
        }
        fixed.push(region.slug);
      } catch (e) {
        skipped.push({ slug: region.slug, reason: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(
      JSON.stringify({ fixed: fixed.length, fixedSlugs: fixed, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
