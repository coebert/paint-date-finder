import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SubmitEventDialog } from '@/components/SubmitEventDialog';
import { AddEventDialog } from '@/components/AddEventDialog';
import { format, isSameMonth, isSameYear, parseISO } from 'date-fns';
import { CalendarDays, MapPin, Trophy, Star, ExternalLink, Ticket } from 'lucide-react';
import { RouteHead } from '@/components/RouteHead';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { divisionColors, sortDivisions, type CppsRound } from '@/lib/cpps';
import { useCppsRounds } from '@/hooks/useCppsRounds';
import { useTeams, type Team } from '@/hooks/useTeams';
import { StandingsHistoryCard } from '@/components/StandingsHistoryCard';

const MY_TEAM_KEY = 'cpps:my-team';

function formatRoundDates(round: CppsRound): string {
  const { startDate, endDate } = round;
  if (startDate.getTime() === endDate.getTime()) return format(startDate, 'EEEE d MMMM yyyy');
  if (isSameMonth(startDate, endDate)) {
    return `${format(startDate, 'd')} – ${format(endDate, 'd MMMM yyyy')}`;
  }
  if (isSameYear(startDate, endDate)) {
    return `${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM yyyy')}`;
  }
  return `${format(startDate, 'd MMM yyyy')} – ${format(endDate, 'd MMM yyyy')}`;
}

function RoundCard({ round, index }: { round: CppsRound; index: number }) {
  return (
    <li className="relative pl-8 pb-8 last:pb-0">
      {/* Timeline rail */}
      <span
        aria-hidden
        className="absolute left-[11px] top-6 bottom-0 w-px bg-border/60 last:hidden"
      />
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold',
          round.isNext
            ? 'border-accent bg-accent text-accent-foreground'
            : round.isPast
              ? 'border-border bg-secondary text-muted-foreground'
              : 'border-accent/50 bg-secondary text-foreground',
        )}
      >
        {index + 1}
      </span>

      <Card
        className={cn(
          'bg-card border-border/50',
          round.isNext && 'border-accent/40 shadow-[0_0_0_1px_hsl(var(--accent)/0.2)]',
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="font-display text-xl tracking-wide">
              Round {round.round}
            </CardTitle>
            {round.isNext && <Badge className="bg-accent text-accent-foreground">Next up</Badge>}
            {round.isPast && <Badge variant="secondary">Played</Badge>}
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              {formatRoundDates(round)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {round.venueName}
              {round.venueLocation ? ` — ${round.venueLocation}` : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="divide-y divide-border/40">
            {round.events.map((ev) => {
              const dayLabel = /^cpps round \d+\s*[—–-]\s*(.+)$/i.exec(ev.title)?.[1];
              return (
                <li key={ev.id} className="flex items-center gap-3 py-2 text-sm">
                  <Link
                    to={`/events/${ev.id}`}
                    className="font-medium text-foreground hover:text-accent transition-colors"
                  >
                    {format(parseISO(ev.event_date), 'EEE d MMM')}
                  </Link>
                  {dayLabel && <span className="text-muted-foreground">{dayLabel}</span>}
                  {ev.booking_url && (
                    <a
                      href={ev.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <Ticket className="h-3.5 w-3.5" aria-hidden />
                      Book
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </li>
  );
}

function StandingsTable({
  teams,
  myTeamId,
}: {
  teams: Team[];
  myTeamId: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 w-10">#</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-3 py-2 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => {
            const isMine = team.id === myTeamId;
            return (
              <tr
                key={team.id}
                className={cn(
                  'border-b border-border/30 last:border-0 transition-colors',
                  isMine ? 'bg-accent/10' : 'hover:bg-secondary/30',
                )}
              >
                <td className="px-3 py-2 text-muted-foreground">{team.position ?? i + 1}</td>
                <td className="px-3 py-2">
                  <Link
                    to={`/teams/${team.id}`}
                    className={cn(
                      'font-medium hover:text-accent transition-colors inline-flex items-center gap-1.5',
                      isMine ? 'text-accent' : 'text-foreground',
                    )}
                  >
                    {team.name}
                    {isMine && <Star className="h-3.5 w-3.5 fill-accent" aria-label="My team" />}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{team.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CppsRounds() {
  const { data: rounds, isLoading: roundsLoading } = useCppsRounds();
  const { data: teams, isLoading: teamsLoading } = useTeams({ league: 'CPPS' });

  const [myTeamId, setMyTeamId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(MY_TEAM_KEY);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (myTeamId) localStorage.setItem(MY_TEAM_KEY, myTeamId);
      else localStorage.removeItem(MY_TEAM_KEY);
    } catch {
      /* private mode — ignore */
    }
  }, [myTeamId]);

  const teamsByDivision = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const t of teams ?? []) {
      const list = map.get(t.division) ?? [];
      list.push(t);
      map.set(t.division, list);
    }
    return map;
  }, [teams]);
  const divisions = useMemo(() => sortDivisions([...teamsByDivision.keys()]), [teamsByDivision]);
  const myTeam = useMemo(
    () => (teams ?? []).find((t) => t.id === myTeamId) ?? null,
    [teams, myTeamId],
  );

  const loading = roundsLoading || teamsLoading;

  return (
    <div className="min-h-dvh bg-background">
      <RouteHead
        title="CPPS Rounds, Dates & Standings"
        description="Every CPPS round with dates, venues and entry links, plus live division standings. Follow your team's progress through the season."
        path="/cpps"
      />
      <Header
        view="calendar"
        onViewChange={() => {}}
        onAddEvent={() => {}}
        onSubmitEvent={() => {}}
        onImportFlyer={() => {}}
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <header className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-foreground flex items-center gap-3">
            <Trophy className="h-8 w-8 text-accent" aria-hidden />
            CPPS Season Tracker
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Every round of the Central Paintball Premier Series with dates and venues, the current
            division standings, and a shortcut to track your own team.
          </p>
        </header>

        {/* My team picker + progress */}
        <section aria-labelledby="my-team-heading" className="mb-10">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle id="my-team-heading" className="font-display text-lg tracking-wide">
                Track your team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={myTeamId ?? ''}
                onValueChange={(v) => setMyTeamId(v === 'none' ? null : v)}
              >
                <SelectTrigger className="w-full sm:max-w-sm" aria-label="Choose your team">
                  <SelectValue placeholder="Choose your team…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team selected</SelectItem>
                  {divisions.map((div) => (
                    <div key={div}>
                      <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {div}
                      </div>
                      {(teamsByDivision.get(div) ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>

              {myTeam && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={divisionColors[myTeam.division] ?? 'bg-muted text-muted-foreground'}
                  >
                    {myTeam.division}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Trophy className="h-3 w-3" aria-hidden />
                    {myTeam.points} pts
                  </Badge>
                  {myTeam.position && <Badge variant="secondary">#{myTeam.position}</Badge>}
                  <Link
                    to={`/teams/${myTeam.id}`}
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    Team page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              )}

              {myTeam && <StandingsHistoryCard teamId={myTeam.id} />}
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          {/* Rounds timeline */}
          <section aria-labelledby="rounds-heading">
            <h2 id="rounds-heading" className="font-display text-2xl tracking-wide mb-4">
              Rounds & dates
            </h2>
            {roundsLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : rounds && rounds.length > 0 ? (
              <ol>
                {rounds.map((r, i) => (
                  <RoundCard key={r.round} round={r} index={i} />
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm">
                No CPPS rounds are in the calendar yet — check back soon.
              </p>
            )}
          </section>

          {/* Standings */}
          <section aria-labelledby="standings-heading">
            <h2 id="standings-heading" className="font-display text-2xl tracking-wide mb-4">
              Standings
            </h2>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : divisions.length > 0 ? (
              <Tabs defaultValue={divisions[0]}>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/60">
                  {divisions.map((div) => (
                    <TabsTrigger key={div} value={div} className="text-xs sm:text-sm">
                      {div}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {divisions.map((div) => (
                  <TabsContent key={div} value={div} className="mt-4">
                    <StandingsTable
                      teams={teamsByDivision.get(div) ?? []}
                      myTeamId={myTeamId}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-muted-foreground text-sm">No CPPS standings available yet.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
