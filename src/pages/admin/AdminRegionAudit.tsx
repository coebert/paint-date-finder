import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCcw,
  XCircle,
  Lightbulb,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Severity = "ok" | "warn" | "fail";

interface StoredIssue { severity: Severity; code: string; message: string; suggestion: string }
interface IndexStatus {
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  lastCrawlTime: string | null;
  error: string | null;
}
interface StoredRow {
  slug: string; name: string; url: string;
  venueCount: number; upcomingCount: number;
  introWords: number; totalWords: number;
  duplicationScore?: number;
  indexStatus?: IndexStatus | null;
  worstSeverity: Severity;
  issues: StoredIssue[];
  duplicatePartners: string[];
  cityOverlapPartners: { region: string; cities: string[] }[];
}

interface RunRow {
  id: string;
  created_at: string;
  fail_count: number;
  warn_count: number;
  ok_count: number;
  fingerprint: string;
  rows: StoredRow[];
  triggered_by: string;
}

const LAST_SEEN_KEY = "region-audit:last-seen-fingerprint";

function SeverityBadge({ severity }: { severity: Severity }) {
  if (severity === "fail") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Fail</Badge>;
  if (severity === "warn") return <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-500"><AlertTriangle className="h-3 w-3" /> Warn</Badge>;
  return <Badge className="gap-1 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20"><CheckCircle2 className="h-3 w-3" /> OK</Badge>;
}

export function useLatestRegionAuditRun() {
  return useQuery({
    queryKey: ["region-audit-runs", "latest"],
    queryFn: async (): Promise<RunRow | null> => {
      const { data, error } = await supabase
        .from("region_audit_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as RunRow) ?? null;
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export default function AdminRegionAudit() {
  const qc = useQueryClient();
  const { data: latest, isLoading } = useLatestRegionAuditRun();
  const { data: previous } = useQuery({
    queryKey: ["region-audit-runs", "previous", latest?.id],
    enabled: !!latest,
    queryFn: async (): Promise<RunRow | null> => {
      const { data, error } = await supabase
        .from("region_audit_runs")
        .select("*")
        .lt("created_at", latest!.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as RunRow) ?? null;
    },
  });
  const { data: history } = useQuery({
    queryKey: ["region-audit-runs", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("region_audit_runs")
        .select("id,created_at,fail_count,warn_count,ok_count,fingerprint,triggered_by")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const prevBySlug = useMemo(() => {
    const map = new Map<string, StoredRow>();
    for (const r of previous?.rows ?? []) map.set(r.slug, r);
    return map;
  }, [previous]);

  const [running, setRunning] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(LAST_SEEN_KEY),
  );

  const newSinceLastSeen = useMemo(() => {
    if (!latest || !lastSeen) return null;
    if (latest.fingerprint === lastSeen) return null;
    const prevCodes = new Set(lastSeen.split("|").filter(Boolean));
    const currentCodes = latest.rows.flatMap((r) => r.issues.map((i) => `${r.slug}:${i.code}`));
    const added = currentCodes.filter((c) => !prevCodes.has(c));
    return added;
  }, [latest, lastSeen]);

  function markSeen() {
    if (!latest) return;
    localStorage.setItem(LAST_SEEN_KEY, latest.fingerprint);
    setLastSeen(latest.fingerprint);
    toast.success("Marked current issues as seen");
  }

  async function runNow() {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("region-audit-cron", { body: {} });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["region-audit-runs"] });
      toast.success("Audit complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  }

  const autoFixableCodes = new Set([
    "thin_intro",
    "low_word_count",
    "few_cities",
    "duplicate_intro",
    "overlapping_cities",
  ]);
  const autoFixableCount = useMemo(() => {
    if (!latest) return 0;
    return latest.rows.filter((r) => r.issues.some((i) => autoFixableCodes.has(i.code))).length;
  }, [latest]);

  async function autoFixAll() {
    if (autoFixableCount === 0) {
      toast.info("Nothing to auto-fix in the latest run.");
      return;
    }
    setAutoFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke("region-audit-autofix", { body: {} });
      if (error) throw error;
      const fixed = (data as { fixed?: number } | null)?.fixed ?? 0;
      const skipped = (data as { skipped?: unknown[] } | null)?.skipped ?? [];
      toast.success(`Auto-fixed ${fixed} region${fixed === 1 ? "" : "s"}${skipped.length ? ` (${skipped.length} skipped)` : ""}`);
      // Immediately re-run audit so the issues clear.
      const { error: rErr } = await supabase.functions.invoke("region-audit-cron", { body: {} });
      if (rErr) throw rErr;
      await qc.invalidateQueries({ queryKey: ["region-audit-runs"] });
      await qc.invalidateQueries({ queryKey: ["region-content-override"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto-fix failed");
    } finally {
      setAutoFixing(false);
    }
  }

  // First-time visitors: silently mark current state seen.
  useEffect(() => {
    if (latest && !lastSeen) {
      localStorage.setItem(LAST_SEEN_KEY, latest.fingerprint);
      setLastSeen(latest.fingerprint);
    }
  }, [latest, lastSeen]);

  const rows = latest?.rows ?? [];

  return (
    <AdminLayout
      title="REGION CONTENT AUDIT"
      description="Nightly scan for thin or duplicate region landing pages, with fix suggestions"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Latest run</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Scheduled nightly at 03:15 UTC. Run on demand any time.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={autoFixAll}
                disabled={autoFixing || running || autoFixableCount === 0}
                variant="secondary"
                className="gap-2"
                title={autoFixableCount === 0 ? "No auto-fixable issues" : `Use AI to fix ${autoFixableCount} region${autoFixableCount === 1 ? "" : "s"}`}
              >
                {autoFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {autoFixing ? "Fixing…" : `Auto-fix all (${autoFixableCount})`}
              </Button>
              <Button onClick={runNow} disabled={running || autoFixing} className="gap-2">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {running ? "Running…" : "Run now"}
              </Button>
            </div>
          </CardHeader>
          {latest && (
            <CardContent className="text-xs text-muted-foreground flex flex-wrap gap-4">
              <span>Last run: {format(parseISO(latest.created_at), "dd/MM/yyyy HH:mm 'UTC'")}</span>
              <span>Fail: {latest.fail_count}</span>
              <span>Warn: {latest.warn_count}</span>
              <span>OK: {latest.ok_count}</span>
              <span>Trigger: {latest.triggered_by}</span>
            </CardContent>
          )}
        </Card>

        {newSinceLastSeen && newSinceLastSeen.length > 0 && (
          <Card className="border-yellow-500/40 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2 text-yellow-500">
                  <Bell className="h-5 w-5" />
                  {newSinceLastSeen.length} new issue{newSinceLastSeen.length === 1 ? "" : "s"} since you last looked
                </span>
                <Button size="sm" variant="outline" onClick={markSeen}>Mark as seen</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
                {newSinceLastSeen.slice(0, 10).map((code) => (
                  <li key={code}>{code}</li>
                ))}
                {newSinceLastSeen.length > 10 && (
                  <li>…and {newSinceLastSeen.length - 10} more</li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        {isLoading && !latest && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading latest audit run…
            </CardContent>
          </Card>
        )}

        {!isLoading && !latest && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No audit runs yet. Click "Run now" to create the first one.
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <div className="space-y-4">
            {rows
              .slice()
              .sort((a, b) => {
                const order: Record<Severity, number> = { fail: 0, warn: 1, ok: 2 };
                return order[a.worstSeverity] - order[b.worstSeverity];
              })
              .map((row) => (
                <Card
                  key={row.slug}
                  className={
                    row.worstSeverity === "fail"
                      ? "border-destructive/40"
                      : row.worstSeverity === "warn"
                        ? "border-yellow-500/30"
                        : undefined
                  }
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {row.name}
                          <SeverityBadge severity={row.worstSeverity} />
                        </CardTitle>
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1"
                        >
                          {row.url} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="outline">{row.venueCount} venues</Badge>
                        <Badge variant="outline">{row.upcomingCount} upcoming</Badge>
                        <Badge variant="outline">{row.introWords} intro words</Badge>
                        <Badge variant="outline">~{row.totalWords} total words</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {row.issues.length === 0 ? (
                      <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> No issues detected.
                      </p>
                    ) : (
                      row.issues.map((issue, idx) => (
                        <div
                          key={`${row.slug}-${issue.code}-${idx}`}
                          className={`border-l-2 pl-3 py-1 ${issue.severity === "fail" ? "border-destructive/60" : "border-yellow-500/50"}`}
                        >
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={issue.severity} />
                            <span className="font-medium">{issue.message}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
                            <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-accent" />
                            <span>{issue.suggestion}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {history && history.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Recent runs</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">When</th>
                    <th className="text-left py-2 pr-3">Fail</th>
                    <th className="text-left py-2 pr-3">Warn</th>
                    <th className="text-left py-2 pr-3">OK</th>
                    <th className="text-left py-2 pr-3">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2 pr-3">{format(parseISO(h.created_at), "dd/MM/yyyy HH:mm")}</td>
                      <td className="py-2 pr-3">{h.fail_count}</td>
                      <td className="py-2 pr-3">{h.warn_count}</td>
                      <td className="py-2 pr-3">{h.ok_count}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{h.triggered_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
