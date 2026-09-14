import { parseISO, startOfDay } from 'date-fns';

/** Minimal shape of a CPPS event row needed for round grouping. */
export interface CppsEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string;
  venue_location: string | null;
  booking_url: string | null;
  price_info: string | null;
}

export interface CppsRound {
  /** Calendar year the round was played in, e.g. "2025". */
  season: string;
  round: number;
  events: CppsEvent[];
  startDate: Date;
  endDate: Date;
  venueName: string;
  venueLocation: string | null;
  isPast: boolean;
  isNext: boolean;
}

/** Extract the round number from titles like "CPPS Round 5 — Day 1". */
export function parseRoundNumber(title: string): number | null {
  const m = /\bround\s*(\d+)\b/i.exec(title);
  return m ? parseInt(m[1], 10) : null;
}

/** The season a CPPS event belongs to — the calendar year of its date. */
export function seasonOf(eventDate: string): string {
  return eventDate.slice(0, 4);
}

/**
 * Group CPPS events into rounds. Rounds are keyed by season + round number so
 * "Round 1" in different years never merge, and sorted newest season first.
 */
export function groupCppsRounds(
  events: CppsEvent[],
  today: Date = startOfDay(new Date()),
): CppsRound[] {
  const byRound = new Map<string, CppsEvent[]>();
  for (const ev of events) {
    const round = parseRoundNumber(ev.title);
    if (round === null) continue;
    const key = `${seasonOf(ev.event_date)}#${round}`;
    const list = byRound.get(key) ?? [];
    list.push(ev);
    byRound.set(key, list);
  }

  const rounds: CppsRound[] = [...byRound.entries()].map(([key, evs]) => {
    const [season, roundStr] = key.split('#');
    const dates = evs
      .map((e) => startOfDay(parseISO(e.event_date)))
      .sort((a, b) => a.getTime() - b.getTime());
    const sorted = [...evs].sort((a, b) => a.event_date.localeCompare(b.event_date));
    return {
      season,
      round: parseInt(roundStr, 10),
      events: sorted,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      venueName: sorted[0].venue_name,
      venueLocation: sorted[0].venue_location,
      isPast: dates[dates.length - 1] < today,
      isNext: false,
    };
  });

  rounds.sort((a, b) => (a.season === b.season ? a.round - b.round : b.season.localeCompare(a.season)));
  // "Next up" is the soonest unplayed round across every season.
  const upcoming = rounds.filter((r) => !r.isPast);
  upcoming.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  if (upcoming[0]) upcoming[0].isNext = true;
  return rounds;
}

/** Seasons present in a set of rounds, newest first. */
export function seasonsFromRounds(rounds: CppsRound[]): string[] {
  return [...new Set(rounds.map((r) => r.season))].sort((a, b) => b.localeCompare(a));
}

export interface SeasonStanding {
  teamName: string;
  division: string;
  points: number;
  roundsPlayed: number;
  bestPosition: number | null;
}

/**
 * Build a division-by-division standings table from recorded round results.
 * Used for past seasons, where the live `teams` table no longer applies.
 */
export function computeSeasonStandings(results: CppsRoundResult[]): Map<string, SeasonStanding[]> {
  const byDivision = new Map<string, Map<string, SeasonStanding>>();
  for (const r of results) {
    const teams = byDivision.get(r.division) ?? new Map<string, SeasonStanding>();
    const key = r.team_name.trim().toLowerCase();
    const current =
      teams.get(key) ??
      ({
        teamName: r.team_name.trim(),
        division: r.division,
        points: 0,
        roundsPlayed: 0,
        bestPosition: null,
      } satisfies SeasonStanding);
    current.points += r.points;
    current.roundsPlayed += 1;
    if (r.position !== null) {
      current.bestPosition =
        current.bestPosition === null ? r.position : Math.min(current.bestPosition, r.position);
    }
    teams.set(key, current);
    byDivision.set(r.division, teams);
  }

  const out = new Map<string, SeasonStanding[]>();
  for (const [division, teams] of byDivision) {
    out.set(
      division,
      [...teams.values()].sort((a, b) => b.points - a.points || a.teamName.localeCompare(b.teamName)),
    );
  }
  return out;
}

/** A single team's result for one CPPS round. */
export interface CppsRoundResult {
  id: string;
  season: string;
  round: number;
  division: string;
  team_id: string | null;
  team_name: string;
  position: number | null;
  points: number;
  notes: string | null;
}

export interface TeamRoundResult {
  position: number | null;
  points: number;
}

const teamKey = (name: string) => name.trim().toLowerCase();

/**
 * Index results by team (case-insensitive name) then round, so a standings
 * table can render a points column per played round.
 */
export function indexResultsByTeam(
  results: CppsRoundResult[],
): Map<string, Map<number, TeamRoundResult>> {
  const map = new Map<string, Map<number, TeamRoundResult>>();
  for (const r of results) {
    const key = teamKey(r.team_name);
    const rounds = map.get(key) ?? new Map<number, TeamRoundResult>();
    rounds.set(r.round, { position: r.position, points: r.points });
    map.set(key, rounds);
  }
  return map;
}

/** Look up a team's result for a round by team name. */
export function lookupTeamRound(
  index: Map<string, Map<number, TeamRoundResult>>,
  teamName: string,
  round: number,
): TeamRoundResult | undefined {
  return index.get(teamKey(teamName))?.get(round);
}

/** Group results by round number, each sorted by finishing position. */
export function groupResultsByRound(results: CppsRoundResult[]): Map<number, CppsRoundResult[]> {
  const map = new Map<number, CppsRoundResult[]>();
  for (const r of results) {
    const list = map.get(r.round) ?? [];
    list.push(r);
    map.set(r.round, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.position !== b.position) {
        if (a.position === null) return 1;
        if (b.position === null) return -1;
        return a.position - b.position;
      }
      return b.points - a.points;
    });
  }
  return map;
}

/** Rounds that have at least one recorded result, ascending. */
export function roundsWithResults(results: CppsRoundResult[]): number[] {
  return [...new Set(results.map((r) => r.round))].sort((a, b) => a - b);
}

export const CPPS_DIVISION_ORDER = [
  'Elite',
  'Semi-Pro',
  'Division 1',
  'Division 2',
  'Division 3',
  'Division 4',
  'Division 5',
  'Breakout',
] as const;

export const divisionColors: Record<string, string> = {
  Elite: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Semi-Pro': 'bg-amber-600/20 text-amber-300 border-amber-600/30',
  'Division 1': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'Division 2': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Division 3': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Division 4': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Division 5': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Breakout: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  Independent: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export function sortDivisions(divisions: string[]): string[] {
  return [...divisions].sort((a, b) => {
    const ai = CPPS_DIVISION_ORDER.indexOf(a as (typeof CPPS_DIVISION_ORDER)[number]);
    const bi = CPPS_DIVISION_ORDER.indexOf(b as (typeof CPPS_DIVISION_ORDER)[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}
