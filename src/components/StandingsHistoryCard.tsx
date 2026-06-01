import { useMemo } from 'react';
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
import { TrendingUp, TrendingDown, Minus, History } from 'lucide-react';
import { useTeamStandingsHistory } from '@/hooks/useStandingsHistory';

interface Props {
  teamId: string;
}

export function StandingsHistoryCard({ teamId }: Props) {
  const { data: history = [], isLoading } = useTeamStandingsHistory(teamId);

  const chartData = useMemo(
    () =>
      history.map((h) => ({
        ts: new Date(h.captured_at).getTime(),
        label: format(new Date(h.captured_at), 'dd/MM/yyyy'),
        position: h.position,
        points: h.points,
        division: h.division,
      })),
    [history],
  );

  const first = history[0];
  const last = history[history.length - 1];
  const posDelta =
    first?.position != null && last?.position != null
      ? first.position - last.position // positive = moved up
      : null;
  const pointsDelta =
    first && last ? (last.points ?? 0) - (first.points ?? 0) : null;

  // Invert position axis so #1 is at the top
  const positions = chartData
    .map((d) => d.position)
    .filter((v): v is number => v != null);
  const posDomain: [number, number] | undefined =
    positions.length > 0
      ? [Math.max(...positions) + 1, Math.max(1, Math.min(...positions) - 1)]
      : undefined;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="font-display tracking-wider text-lg flex items-center gap-2">
          <History className="w-4 h-4" />
          STANDINGS HISTORY
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            Loading history…
          </p>
        ) : history.length < 2 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            Not enough data yet — history will appear here as the CPPS
            standings update.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {posDelta != null && (
                <Badge variant="secondary" className="gap-1">
                  {posDelta > 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : posDelta < 0 ? (
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  Position {posDelta > 0 ? `+${posDelta}` : posDelta}
                </Badge>
              )}
              {pointsDelta != null && (
                <Badge variant="secondary" className="gap-1">
                  {pointsDelta > 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : pointsDelta < 0 ? (
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {pointsDelta > 0 ? '+' : ''}
                  {pointsDelta} pts
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {history.length} snapshot{history.length === 1 ? '' : 's'}
              </span>
            </div>

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
      </CardContent>
    </Card>
  );
}
