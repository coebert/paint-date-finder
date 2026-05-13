import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface Snapshot {
  id: string;
  captured_at: string;
  sitemap_submitted: number | null;
  sitemap_indexed: number | null;
  sitemap_errors: number | null;
  sitemap_warnings: number | null;
  total_clicks: number | null;
  total_impressions: number | null;
  avg_ctr: number | null;
  avg_position: number | null;
  top_queries: Array<{ key: string; clicks: number; impressions: number; position: number }> | null;
  top_pages: Array<{ key: string; clicks: number; impressions: number; position: number }> | null;
  regressions: Array<{ kind: string; message: string }> | null;
  alert_sent: boolean;
}

function delta(curr: number | null, prev: number | null): { pct: number; up: boolean } | null {
  if (curr == null || prev == null || prev === 0) return null;
  const pct = ((curr - prev) / prev) * 100;
  return { pct, up: pct >= 0 };
}

function DeltaBadge({ d }: { d: ReturnType<typeof delta> }) {
  if (!d) return <span className="text-muted-foreground text-xs">—</span>;
  const Icon = d.up ? TrendingUp : TrendingDown;
  const cls = d.up ? "text-primary" : "text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${cls}`}>
      <Icon className="h-3 w-3" />
      {d.pct >= 0 ? "+" : ""}
      {d.pct.toFixed(1)}%
    </span>
  );
}

export default function AdminSEO() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["seo_snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_snapshots")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Snapshot[];
    },
  });

  const runNow = useMutation({
    mutationFn: async () => {
      setRunning(true);
      const { data, error } = await supabase.functions.invoke("seo-monitor", {
        body: { source: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (res) => {
      toast.success(
        res?.regressions
          ? `Snapshot saved (${res.regressions} regression${res.regressions === 1 ? "" : "s"} flagged).`
          : "Snapshot saved.",
      );
      queryClient.invalidateQueries({ queryKey: ["seo_snapshots"] });
    },
    onError: (e: Error) => toast.error(`Run failed: ${e.message}`),
    onSettled: () => setRunning(false),
  });

  const latest = data?.[0];
  const previous = data?.[1];

  const indexedDelta = useMemo(
    () => delta(latest?.sitemap_indexed ?? null, previous?.sitemap_indexed ?? null),
    [latest, previous],
  );
  const clicksDelta = useMemo(
    () => delta(latest?.total_clicks ?? null, previous?.total_clicks ?? null),
    [latest, previous],
  );
  const imprDelta = useMemo(
    () => delta(latest?.total_impressions ?? null, previous?.total_impressions ?? null),
    [latest, previous],
  );
  const posDelta = useMemo(() => {
    // Lower is better for position — invert.
    const d = delta(latest?.avg_position ?? null, previous?.avg_position ?? null);
    return d ? { pct: -d.pct, up: !d.up } : null;
  }, [latest, previous]);

  return (
    <AdminLayout
      title="SEO Monitor"
      description="Daily sitemap and search-analytics snapshots from Google Search Console. Alerts are emailed when key metrics regress."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Last snapshot:{" "}
            {latest
              ? format(parseISO(latest.captured_at), "EEE d MMM yyyy 'at' HH:mm")
              : "no snapshots yet"}
          </div>
          <Button onClick={() => runNow.mutate()} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Run snapshot now
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading snapshots…
          </div>
        ) : !latest ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No snapshots yet. Click "Run snapshot now" to capture the first one.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Indexed URLs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl text-foreground">
                    {latest.sitemap_indexed ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    of {latest.sitemap_submitted ?? "—"} submitted · <DeltaBadge d={indexedDelta} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Clicks (7d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl text-foreground">
                    {latest.total_clicks ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <DeltaBadge d={clicksDelta} /> vs prior snapshot
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Impressions (7d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl text-foreground">
                    {latest.total_impressions ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    CTR {latest.avg_ctr ? (latest.avg_ctr * 100).toFixed(2) + "%" : "—"} · <DeltaBadge d={imprDelta} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Avg position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl text-foreground">
                    {latest.avg_position?.toFixed(1) ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <DeltaBadge d={posDelta} /> (lower is better)
                  </div>
                </CardContent>
              </Card>
            </div>

            {latest.regressions && latest.regressions.length > 0 ? (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    {latest.regressions.length} regression{latest.regressions.length === 1 ? "" : "s"} flagged
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {latest.regressions.map((r, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-semibold text-destructive">{r.kind}:</span>{" "}
                      <span className="text-foreground">{r.message}</span>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-muted-foreground">
                    {latest.alert_sent ? "Email alert sent." : "Alert email could not be sent — check function logs."}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-2 py-4 text-sm text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  No regressions in the latest snapshot.
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top queries (7d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {(latest.top_queries ?? []).slice(0, 10).map((q) => (
                      <li key={q.key} className="flex items-center justify-between gap-2">
                        <span className="truncate text-foreground">{q.key}</span>
                        <span className="text-muted-foreground shrink-0">
                          {q.clicks} clk · {q.impressions} imp · pos {q.position.toFixed(1)}
                        </span>
                      </li>
                    ))}
                    {(!latest.top_queries || latest.top_queries.length === 0) && (
                      <li className="text-muted-foreground">No data yet.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top pages (7d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {(latest.top_pages ?? []).slice(0, 10).map((p) => (
                      <li key={p.key} className="flex items-center justify-between gap-2">
                        <span className="truncate text-foreground">{p.key.replace("https://findawalkon.com", "")}</span>
                        <span className="text-muted-foreground shrink-0">
                          {p.clicks} clk · {p.impressions} imp
                        </span>
                      </li>
                    ))}
                    {(!latest.top_pages || latest.top_pages.length === 0) && (
                      <li className="text-muted-foreground">No data yet.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent snapshots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-normal">Date</th>
                        <th className="py-2 pr-4 font-normal">Indexed</th>
                        <th className="py-2 pr-4 font-normal">Clicks</th>
                        <th className="py-2 pr-4 font-normal">Impr.</th>
                        <th className="py-2 pr-4 font-normal">Pos.</th>
                        <th className="py-2 pr-4 font-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.map((s) => (
                        <tr key={s.id} className="border-b border-border/30 last:border-0">
                          <td className="py-2 pr-4 text-foreground">
                            {format(parseISO(s.captured_at), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td className="py-2 pr-4">{s.sitemap_indexed ?? "—"}</td>
                          <td className="py-2 pr-4">{s.total_clicks ?? "—"}</td>
                          <td className="py-2 pr-4">{s.total_impressions ?? "—"}</td>
                          <td className="py-2 pr-4">{s.avg_position?.toFixed(1) ?? "—"}</td>
                          <td className="py-2 pr-4">
                            {s.regressions && s.regressions.length > 0 ? (
                              <Badge variant="outline" className="border-destructive/40 text-destructive">
                                {s.regressions.length} alert
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-primary/40 text-primary">
                                OK
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
