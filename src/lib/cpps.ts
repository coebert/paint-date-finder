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

/** Group CPPS events into rounds, sorted by round number. */
export function groupCppsRounds(events: CppsEvent[], today: Date = startOfDay(new Date())): CppsRound[] {
  const byRound = new Map<number, CppsEvent[]>();
  for (const ev of events) {
    const round = parseRoundNumber(ev.title);
    if (round === null) continue;
    const list = byRound.get(round) ?? [];
    list.push(ev);
    byRound.set(round, list);
  }

  const rounds: CppsRound[] = [...byRound.entries()].map(([round, evs]) => {
    const dates = evs
      .map((e) => startOfDay(parseISO(e.event_date)))
      .sort((a, b) => a.getTime() - b.getTime());
    const sorted = [...evs].sort((a, b) => a.event_date.localeCompare(b.event_date));
    return {
      round,
      events: sorted,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      venueName: sorted[0].venue_name,
      venueLocation: sorted[0].venue_location,
      isPast: dates[dates.length - 1] < today,
      isNext: false,
    };
  });

  rounds.sort((a, b) => a.round - b.round);
  const next = rounds.find((r) => !r.isPast);
  if (next) next.isNext = true;
  return rounds;
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
