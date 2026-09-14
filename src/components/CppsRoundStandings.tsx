import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  CPPS_MY_TEAM_KEY,
  divisionColors,
  isCppsRoundEvent,
  parseRoundNumber,
  seasonOf,
  sortDivisions,
  type CppsRoundResult,
} from '@/lib/cpps';
import { useCppsResults } from '@/hooks/useCppsResults';
import { useTeams } from '@/hooks/useTeams';

interface CppsRoundStandingsProps {
  /** Event title, e.g. "CPPS Round 3 — Day 2". */
  title: string;
  /** Event date as stored, e.g. "2026-07-04". */
  eventDate: string;
  className?: string;
}

function readMyTeamId(): string | null {
  try {
    return localStorage.getItem(CPPS_MY_TEAM_KEY);
  } catch {
    return null;
  }
}

const sameTeam = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Standings for the CPPS round an event belongs to, shown inline in the event
 * details so a visitor can see their team's progress without opening /cpps.
 * Renders nothing for events that are not CPPS rounds.
 */
export function CppsRoundStandings({ title, eventDate, className }: CppsRoundStandingsProps) {
  const isCpps = isCppsRoundEvent(title);
  const round = parseRoundNumber(title);
  const season = seasonOf(eventDate);

  const { data: results, isLoading } = useCppsResults(season);
  const { data: teams } = useTeams({ league: 'CPPS' });

  const myTeamName = useMemo(() => {
    const id = readMyTeamId();
    if (!id) return null;
    return teams?.find((t) => t.id === id)?.name ?? null;
  }, [teams]);

  const roundResults = useMemo(
    () => (results ?? []).filter((r) => r.round === round),
    [results, round],
  );

  const byDivision = useMemo(() => {
    const map = new Map<string, CppsRoundResult[]>();
    for (const r of roundResults) {
      const list = map.get(r.division) ?? [];
      list.push(r);
      map.set(r.division, list);
    }
    return map;
  }, [roundResults]);

  /** Tracked team's result for this round plus its season points up to here. */
  const mine = useMemo(() => {
    if (!myTeamName || round === null) return null;
    const thisRound = roundResults.find((r) => sameTeam(r.team_name, myTeamName));
    const toDate = (results ?? []).filter(
      (r) => r.round <= round && sameTeam(r.team_name, myTeamName),
    );
    if (!thisRound && toDate.length === 0) return null;
    return {
      thisRound,
      seasonPoints: toDate.reduce((sum, r) => sum + r.points, 0),
      roundsPlayed: toDate.length,
    };
  }, [myTeamName, results, roundResults, round]);

  if (!isCpps || round === null) return null;

  const divisions = sortDivisions([...byDivision.keys()]);

  return (
    <section
      className={cn('rounded-lg border border-border bg-secondary/30 p-3', className)}
      aria-label={`CPPS Round ${round} standings`}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Trophy className="h-4 w-4 text-accent" />
          Round {round} standings
          <span className="font-normal text-muted-foreground">· {season}</span>
        </h4>
        <Link
          to="/cpps"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          Season tracker
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : roundResults.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Results for this round aren't recorded yet.
        </p>
      ) : (
        <>
          {mine && (
            <p className="mt-2 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-2 text-sm text-foreground">
              <span className="font-semibold">{myTeamName}</span>
              {mine.thisRound ? (
                <>
                  {' — '}
                  {mine.thisRound.position ? `${mine.thisRound.position}` : 'unplaced'} this round,{' '}
                  {mine.thisRound.points} pts
                </>
              ) : (
                ' — no result recorded for this round'
              )}
              <span className="text-muted-foreground">
                {' · '}
                {mine.seasonPoints} pts from {mine.roundsPlayed}{' '}
                {mine.roundsPlayed === 1 ? 'round' : 'rounds'} so far
              </span>
            </p>
          )}

          <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
            {divisions.map((div) => (
              <div key={div} className="space-y-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[11px]',
                    divisionColors[div] ?? 'bg-muted text-muted-foreground',
                  )}
                >
                  {div}
                </Badge>
                <ol className="divide-y divide-border/30">
                  {(byDivision.get(div) ?? []).map((r) => {
                    const isMine = myTeamName ? sameTeam(r.team_name, myTeamName) : false;
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          'flex items-baseline gap-2 py-1.5 text-sm',
                          isMine && 'rounded bg-accent/10 px-1.5 font-semibold text-foreground',
                        )}
                      >
                        <span className="w-6 shrink-0 tabular-nums text-muted-foreground">
                          {r.position ?? '–'}
                        </span>
                        <span className="text-foreground">{r.team_name}</span>
                        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                          {r.points} pts
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
