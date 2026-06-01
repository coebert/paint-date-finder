import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, History, ArrowUp, ArrowDown } from 'lucide-react';
import {
  useTeamStandingsHistory,
  type StandingsHistoryPoint,
} from '@/hooks/useStandingsHistory';

interface Props {
  teamId: string;
}

interface SeasonSummary {
  season: string;
  snapshots: StandingsHistoryPoint[];
  first: StandingsHistoryPoint;
  last: StandingsHistoryPoint;
  finalPosition: number | null;
  finalPoints: number;
  finalDivision: string;
}

function summariseSeason(
  season: string,
  snapshots: StandingsHistoryPoint[],
): SeasonSummary {
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  return {
    season,
    snapshots,
    first,
    last,
    finalPosition: last.position,
    finalPoints: last.points,
    finalDivision: last.division,
  };
}

function getDivisionLevel(division: string): number | null {
  const match = division.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function getDivisionChangeType(
  prevDivision: string,
  currDivision: string,
): 'promotion' | 'relegation' | null {
  const prevLevel = getDivisionLevel(prevDivision);
  const currLevel = getDivisionLevel(currDivision);
  if (prevLevel == null || currLevel == null) return null;
  if (currLevel < prevLevel) return 'promotion';
  if (currLevel > prevLevel) return 'relegation';
  return null;
}

function DivisionChangeBadge({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const changeType = getDivisionChangeType(from, to);
  if (changeType === 'promotion') {
    return (
      <Badge
        variant="secondary"
        className="gap-1 border-emerald-500/30 text-emerald-400"
      >
        <ArrowUp className="w-3 h-3" />
        Promoted
      </Badge>
    );
  }
  if (changeType === 'relegation') {
    return (
      <Badge
        variant="secondary"
        className="gap-1 border-rose-500/30 text-rose-400"
      >
        <ArrowDown className="w-3 h-3" />
        Relegated
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      {from} → {to}
    </Badge>
  );
}

function DeltaBadge({
  label,
  value,
  invertGood = false,
}: {
  label: string;
  value: number | null;
  invertGood?: boolean;
}) {
  if (value == null) return null;
  const positive = invertGood ? value < 0 : value > 0;
  const negative = invertGood ? value > 0 : value < 0;
  const Icon = value === 0 ? Minus : positive ? TrendingUp : TrendingDown;
  const colour =
    value === 0
      ? ''
      : positive
      ? 'text-emerald-400'
      : negative
      ? 'text-rose-400'
      : '';
  const sign = value > 0 ? '+' : '';
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className={`w-3 h-3 ${colour}`} />
      {label} {sign}
      {value}
    </Badge>
  );
}

export function StandingsHistoryCard({ teamId }: Props) {
  const { data: history = [], isLoading } = useTeamStandingsHistory(teamId);

  const seasons = useMemo<SeasonSummary[]>(() => {
    const grouped = new Map<string, StandingsHistoryPoint[]>();
    for (const h of history) {
      const key = h.season || format(new Date(h.captured_at), 'yyyy');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(h);
    }
    return [...grouped.entries()]
      .map(([season, snaps]) => summariseSeason(season, snaps))
      .sort((a, b) => a.season.localeCompare(b.season));
  }, [history]);

  const latestSeason = seasons[seasons.length - 1]?.season;
  const [selected, setSelected] = useState<string | undefined>(latestSeason);
  useEffect(() => {
    if (latestSeason && !selected) setSelected(latestSeason);
  }, [latestSeason, selected]);

  const current = seasons.find((s) => s.season === selected);
  const previous = current
    ? seasons[seasons.findIndex((s) => s.season === current.season) - 1]
    : undefined;

  // In-season deltas (first vs last snapshot of the selected season)
  const inSeasonPosDelta =
    current?.first.position != null && current?.last.position != null
      ? current.first.position - current.last.position
      : null;
  const inSeasonPointsDelta = current
    ? (current.last.points ?? 0) - (current.first.points ?? 0)
    : null;

  // Season-to-season deltas (previous season final vs current season final)
  const seasonPosDelta =
    previous?.finalPosition != null && current?.finalPosition != null
      ? previous.finalPosition - current.finalPosition
      : null;
  const seasonPointsDelta =
    previous && current ? current.finalPoints - previous.finalPoints : null;
  const divisionChanged =
    previous && current && previous.finalDivision !== current.finalDivision;

  const chartData = useMemo(
    () =>
      (current?.snapshots ?? []).map((h) => ({
        label: format(new Date(h.captured_at), 'dd/MM'),
        position: h.position,
        points: h.points,
        division: h.division,
      })),
    [current],
  );

  const positions = chartData
    .map((d) => d.position)
    .filter((v): v is number => v != null);
  const posDomain: [number, number] | undefined =
    positions.length > 0
      ? [Math.max(...positions) + 1, Math.max(1, Math.min(...positions) - 1)]
      : undefined;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="font-display tracking-wider text-lg flex items-center gap-2">
          <History className="w-4 h-4" />
          STANDINGS HISTORY
        </CardTitle>
        {seasons.length > 0 && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-32 h-8 bg-secondary border-border text-xs">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              {seasons
                .slice()
                .reverse()
                .map((s) => (
                  <SelectItem key={s.season} value={s.season}>
                    {s.season}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            Loading history…
          </p>
        ) : !current ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No standings history recorded yet.
          </p>
        ) : (
          <>
            {/* Season-to-season deltas */}
            {previous && (
              <div className="mb-4 rounded-lg border border-border/50 bg-secondary/40 p-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  vs {previous.season} season finish
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <DeltaBadge
                    label="Position"
                    value={seasonPosDelta}
                    invertGood={false}
                  />
                  <DeltaBadge label="Points" value={seasonPointsDelta} />
                  {divisionChanged && (
                    <Badge variant="secondary" className="gap-1">
                      {previous.finalDivision} → {current.finalDivision}
                    </Badge>
                  )}
                  {seasonPosDelta == null &&
                    seasonPointsDelta == null &&
                    !divisionChanged && (
                      <span className="text-xs text-muted-foreground">
                        No comparable finish recorded.
                      </span>
                    )}
                </div>
              </div>
            )}

            {/* In-season deltas + snapshot count */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">
                {current.season} season
              </Badge>
              <DeltaBadge label="Position" value={inSeasonPosDelta} />
              <DeltaBadge label="Points" value={inSeasonPointsDelta} />
              <span className="text-xs text-muted-foreground">
                {current.snapshots.length} snapshot
                {current.snapshots.length === 1 ? '' : 's'}
              </span>
            </div>

            {current.snapshots.length < 2 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Only one snapshot for this season so far — charts will appear
                once the standings update again.
              </p>
            ) : (
              <>
                {posDomain && (
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Position
                    </p>
                    <div className="h-44 w-full">
                      <ResponsiveContainer>
                        <LineChart
                          data={chartData}
                          margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                        >
                          <CartesianGrid
                            stroke="hsl(var(--border))"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey="label"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            tickMargin={6}
                          />
                          <YAxis
                            domain={posDomain}
                            allowDecimals={false}
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                          />
                          <Tooltip
                            contentStyle={{
                              background: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(v: number, _n, p) => [
                              `#${v} (${p.payload.division})`,
                              'Position',
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="position"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Points
                  </p>
                  <div className="h-44 w-full">
                    <ResponsiveContainer>
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="hsl(var(--border))"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="label"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickMargin={6}
                        />
                        <YAxis
                          allowDecimals={false}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(v: number) => [`${v} pts`, 'Points']}
                        />
                        <Line
                          type="monotone"
                          dataKey="points"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* Per-season finish summary */}
            {seasons.length > 1 && (
              <div className="mt-6 border-t border-border/50 pt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Season finishes
                </p>
                <div className="space-y-1.5">
                  {seasons
                    .slice()
                    .reverse()
                    .map((s) => (
                      <div
                        key={s.season}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground font-medium">
                          {s.season}
                        </span>
                        <span className="text-muted-foreground">
                          {s.finalDivision}
                          {s.finalPosition != null
                            ? ` · #${s.finalPosition}`
                            : ''}
                          {' · '}
                          {s.finalPoints} pts
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
