// Scrapes the public CPPS standings page (okpb.co.uk) and updates the
// `teams` table with the latest division positions and points.
//
// The page lists the top 4 teams per division in the format:
//   Division Name
//   [1. Team Name](url "184 Points")
//   ...
//
// We parse those lines, match teams by case-insensitive name within the
// CPPS league, insert new ones when missing, and update position + points.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SOURCE_URL = "https://www.okpb.co.uk/";

const DIVISION_HEADINGS: Record<string, string> = {
  "elite division": "Elite",
  elite: "Elite",
  "division 2": "Division 2",
  "division 3": "Division 3",
  "division 4": "Division 4",
  "division 5": "Division 5",
  "breakout division": "Breakout",
  breakout: "Breakout",
};

interface ParsedStanding {
  division: string;
  position: number;
  name: string;
  points: number;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseStandings(html: string): ParsedStanding[] {
  // Extract anchor entries with their title attribute for points, plus
  // their visible text (e.g. "1. Trash Pandas"). We also need the
  // preceding division heading.
  const results: ParsedStanding[] = [];

  // Find anchors with a "NN Points" title attribute
  const anchorRe =
    /<a\b[^>]*?title\s*=\s*"(\d+)\s*Points"[^>]*>([\s\S]*?)<\/a>/gi;

  // Collect positions of each anchor and the nearest preceding heading text.
  const text = html;
  const matches: Array<{ index: number; pts: number; label: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(text)) !== null) {
    const label = stripTags(m[2]).replace(/\s+/g, " ").trim();
    matches.push({ index: m.index, pts: parseInt(m[1], 10), label });
  }

  // Find division headings positions
  const headingRe = new RegExp(
    `(${Object.keys(DIVISION_HEADINGS)
      .map((h) => h.replace(/ /g, "\\s+"))
      .join("|")})`,
    "gi",
  );
  const headingHits: Array<{ index: number; division: string }> = [];
  let h: RegExpExecArray | null;
  const plain = stripTags(text);
  while ((h = headingRe.exec(plain)) !== null) {
    const key = h[1].toLowerCase().replace(/\s+/g, " ");
    headingHits.push({ index: h.index, division: DIVISION_HEADINGS[key] });
  }

  // Re-scan plain text for "N. Team Name" lines paired with the previous
  // heading and the Nth anchor inside that section.
  const lineRe = /(\d+)\.\s+([^\n\r]+?)\s*$/gm;
  const lines: Array<{ index: number; pos: number; name: string }> = [];
  let l: RegExpExecArray | null;
  while ((l = lineRe.exec(plain)) !== null) {
    const pos = parseInt(l[1], 10);
    const name = l[2].trim();
    if (pos < 1 || pos > 20 || name.length < 2 || name.length > 80) continue;
    // Skip obvious non-team lines
    if (/^(round|event|date|time|page|home|menu)/i.test(name)) continue;
    lines.push({ index: l.index, pos, name });
  }

  // Pair lines to nearest preceding division heading and to a points anchor
  // by team name match.
  const ptsByLabel = new Map<string, number>();
  for (const a of matches) {
    // anchor label like "1. Trash Pandas"
    const stripped = a.label.replace(/^\d+\.\s*/, "").trim().toLowerCase();
    if (stripped) ptsByLabel.set(stripped, a.pts);
  }

  for (const ln of lines) {
    let currentDivision: string | null = null;
    for (const head of headingHits) {
      if (head.index <= ln.index) currentDivision = head.division;
      else break;
    }
    if (!currentDivision) continue;
    if (ln.pos > 4) continue; // page only lists top 4 reliably
    const key = ln.name.toLowerCase();
    const pts = ptsByLabel.get(key);
    if (pts == null) continue;
    results.push({
      division: currentDivision,
      position: ln.pos,
      name: ln.name,
      points: pts,
    });
  }

  // Deduplicate (division, position)
  const seen = new Set<string>();
  return results.filter((r) => {
    const k = `${r.division}#${r.position}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FindAWalkOnBot/1.0; +https://findawalkon.com)",
      },
    });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    const html = await res.text();

    const standings = parseStandings(html);
    if (standings.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "No standings parsed", chars: html.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }

    // Load existing CPPS teams once
    const { data: existing, error: exErr } = await supabase
      .from("teams")
      .select("id,name,division,position,points")
      .eq("league", "CPPS");
    if (exErr) throw exErr;

    const byName = new Map<string, typeof existing[number]>();
    for (const t of existing ?? []) byName.set(t.name.toLowerCase(), t);

    // Reset position for all CPPS teams in scraped divisions so stale
    // rankings disappear.
    const divisions = [...new Set(standings.map((s) => s.division))];
    if (divisions.length) {
      const { error: clearErr } = await supabase
        .from("teams")
        .update({ position: null })
        .eq("league", "CPPS")
        .in("division", divisions);
      if (clearErr) throw clearErr;
    }

    let inserted = 0;
    let updated = 0;

    for (const s of standings) {
      const found = byName.get(s.name.toLowerCase());
      if (found) {
        const { error } = await supabase
          .from("teams")
          .update({
            division: s.division,
            position: s.position,
            points: s.points,
            is_active: true,
          })
          .eq("id", found.id);
        if (error) throw error;
        updated++;
      } else {
        const { error } = await supabase.from("teams").insert({
          name: s.name,
          division: s.division,
          league: "CPPS",
          position: s.position,
          points: s.points,
          is_active: true,
        });
        if (error) throw error;
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        parsed: standings.length,
        inserted,
        updated,
        source: SOURCE_URL,
        scraped_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("scrape-cpps-standings error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
