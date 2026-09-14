// Keeps the CPPS league standings in sync by calling the public okpb.co.uk
// REST API. The site is an AngularJS SPA backed by JSON endpoints:
//
//   GET /cpps/rest/team           → all registered teams grouped by division
//                                   for the current year.
//   GET /cpps/rest/results/       → full standings per division for each
//                                   season (we use the current year, first
//                                   entry in the array).
//
// We sync each team's division + is_active from the roster endpoint and
// then overlay position + points from the results endpoint. Existing
// editorial fields (logo_url, captain_name, website, description, etc.)
// are never overwritten.

import { adminClient, authorizeAdminOrCron, readEnv } from "../_shared/supabase.ts";
import { errors, json, preflight } from "../_shared/http.ts";

const BASE = "https://www.okpb.co.uk";
const UA =
  "Mozilla/5.0 (compatible; FindAWalkOnBot/1.0; +https://findawalkon.com)";

// Normalize CPPS division titles ("Elite Division", "Division 2", ...) to
// the short labels used in our database.
function normalizeDivision(title: string): string | null {
  const t = title.trim().toLowerCase();
  if (t.startsWith("elite")) return "Elite";
  if (t.startsWith("breakout")) return "Breakout";
  const m = t.match(/^division\s+(\d+)/);
  if (m) return `Division ${m[1]}`;
  return null;
}

interface RosterTeam {
  id: number;
  name: string;
  logourl?: string | null;
}
interface RosterDivision {
  title: string;
  row: RosterTeam[];
}
interface RosterYear {
  year: string;
  division: RosterDivision[];
}

interface ResultsRound {
  position: number | null;
  points: number | null;
  division: string | null;
}
interface ResultsTeam {
  id: number;
  name: string;
  position: number | null;
  score: number | null;
  rounds?: ResultsRound[] | null;
}
interface ResultsDivision {
  title: string;
  row: ResultsTeam[];
}
interface ResultsYear {
  year: string;
  division: ResultsDivision[];
}

// How many seasons of per-round results to sync by default (newest first).
const DEFAULT_SEASON_DEPTH = 3;

interface RoundResultRow {
  season: string;
  round: number;
  division: string;
  team_id: string | null;
  team_name: string;
  position: number | null;
  points: number;
  notes: string | null;
}

// Turn one season of the results feed into per-round rows. Each team's
// `rounds` array is ordered by round number, so index + 1 is the round.
function roundRowsForSeason(
  year: ResultsYear,
  teamIdByName: Map<string, string>,
): RoundResultRow[] {
  const rows: RoundResultRow[] = [];
  for (const div of year.division) {
    const fallbackDivision = normalizeDivision(div.title);
    for (const team of div.row) {
      if (!team?.name) continue;
      const rounds = team.rounds ?? [];
      rounds.forEach((r, i) => {
        if (r == null) return;
        // Rounds not yet played come back as nulls — skip them.
        if (r.position == null && r.points == null) return;
        const division = (r.division ? normalizeDivision(r.division) : null) ??
          fallbackDivision;
        if (!division) return;
        rows.push({
          season: year.year,
          round: i + 1,
          division,
          team_id: teamIdByName.get(team.name.toLowerCase()) ?? null,
          team_name: team.name,
          position: r.position ?? null,
          points: typeof r.points === "number" ? r.points : 0,
          notes: null,
        });
      });
    }
  }
  return rows;
}

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return (await r.json()) as T;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const env = readEnv();
  if (!env) return errors.missingEnv();

  const auth = await authorizeAdminOrCron(req, env);
  if (!auth.ok) return auth.response;

  const supabase = adminClient(env);

  // Optional body: { seasons?: string[], seasonDepth?: number }
  let body: { seasons?: unknown; seasonDepth?: unknown } = {};
  try {
    if (req.method === "POST") body = await req.json();
  } catch {
    body = {};
  }
  const requestedSeasons = Array.isArray(body.seasons)
    ? body.seasons.filter((s): s is string => typeof s === "string" && /^\d{4}$/.test(s))
    : null;
  const seasonDepth = typeof body.seasonDepth === "number" &&
      body.seasonDepth >= 1 && body.seasonDepth <= 20
    ? Math.floor(body.seasonDepth)
    : DEFAULT_SEASON_DEPTH;

  try {
    const [rosters, results] = await Promise.all([
      getJson<RosterYear[]>("/cpps/rest/team"),
      getJson<ResultsYear[]>("/cpps/rest/results"),
    ]);

    const currentRoster = rosters.find((y) =>
      y.year?.toLowerCase() === "current"
    ) ?? rosters[0];
    if (!currentRoster) throw new Error("No current roster returned");

    // results is keyed by year — take the most recent numeric year.
    const currentResults = [...results]
      .filter((y) => /^\d{4}$/.test(y.year))
      .sort((a, b) => Number(b.year) - Number(a.year))[0];

    // Build desired state: name → { division, position, points, cppsId }
    type Desired = {
      name: string;
      division: string;
      position: number | null;
      points: number;
    };
    const desired = new Map<string, Desired>(); // key: lower(name)

    for (const div of currentRoster.division) {
      const division = normalizeDivision(div.title);
      if (!division) continue;
      for (const t of div.row) {
        if (!t?.name) continue;
        desired.set(t.name.toLowerCase(), {
          name: t.name,
          division,
          position: null,
          points: 0,
        });
      }
    }

    if (currentResults) {
      for (const div of currentResults.division) {
        const division = normalizeDivision(div.title);
        if (!division) continue;
        for (const t of div.row) {
          if (!t?.name) continue;
          const key = t.name.toLowerCase();
          const existing = desired.get(key) ?? {
            name: t.name,
            division,
            position: null,
            points: 0,
          };
          existing.division = division;
          existing.position = t.position ?? null;
          existing.points = typeof t.score === "number" ? t.score : 0;
          desired.set(key, existing);
        }
      }
    }

    // Load existing CPPS teams
    const { data: existing, error: exErr } = await supabase
      .from("teams")
      .select("id,name,division,position,points,is_active")
      .eq("league", "CPPS");
    if (exErr) throw exErr;
    const byName = new Map<string, NonNullable<typeof existing>[number]>();
    for (const t of existing ?? []) byName.set(t.name.toLowerCase(), t);

    const desiredKeys = new Set(desired.keys());

    let inserted = 0;
    let updated = 0;
    let deactivated = 0;
    let historyRows = 0;

    const season =
      currentResults?.year && /^\d{4}$/.test(currentResults.year)
        ? currentResults.year
        : String(new Date().getUTCFullYear());

    const historyBatch: Array<{
      team_id: string;
      division: string;
      position: number | null;
      points: number;
      season: string;
    }> = [];

    for (const [key, d] of desired) {
      const found = byName.get(key);
      if (found) {
        const changed =
          found.division !== d.division ||
          found.position !== d.position ||
          (found.points ?? 0) !== d.points;
        const patch: Record<string, unknown> = {};
        if (found.division !== d.division) patch.division = d.division;
        if (found.position !== d.position) patch.position = d.position;
        if ((found.points ?? 0) !== d.points) patch.points = d.points;
        if (found.is_active !== true) patch.is_active = true;
        if (Object.keys(patch).length) {
          const { error } = await supabase
            .from("teams")
            .update(patch)
            .eq("id", found.id);
          if (error) throw error;
          updated++;
        }
        if (changed) {
          historyBatch.push({
            team_id: found.id,
            division: d.division,
            position: d.position,
            points: d.points,
            season,
          });
        }
      } else {
        const { data: newTeam, error } = await supabase
          .from("teams")
          .insert({
            name: d.name,
            division: d.division,
            league: "CPPS",
            position: d.position,
            points: d.points,
            is_active: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        inserted++;
        if (newTeam) {
          historyBatch.push({
            team_id: newTeam.id,
            division: d.division,
            position: d.position,
            points: d.points,
            season,
          });
        }
      }
    }


    for (const [key, t] of byName) {
      if (desiredKeys.has(key)) continue;
      if (t.is_active === false) continue;
      const { error } = await supabase
        .from("teams")
        .update({ is_active: false, position: null })
        .eq("id", t.id);
      if (error) throw error;
      deactivated++;
    }

    if (historyBatch.length) {
      const { error: histErr } = await supabase
        .from("team_standings_history")
        .insert(historyBatch);
      if (histErr) {
        console.error("history insert failed", histErr);
      } else {
        historyRows = historyBatch.length;
      }
    }

    return json({
      ok: true,
      roster_year: currentRoster.year,
      results_year: currentResults?.year ?? null,
      desired: desired.size,
      inserted,
      updated,
      deactivated,
      history_rows: historyRows,
      scraped_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("scrape-cpps-standings error", e);
    return json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
});
