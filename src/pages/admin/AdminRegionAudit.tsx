import { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCcw,
  XCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { runRegionAudit, type RegionAuditReport, type AuditSeverity } from "@/lib/regionAudit";

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  if (severity === "fail") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Fail
      </Badge>
    );
  }
  if (severity === "warn") {
    return (
      <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-500">
        <AlertTriangle className="h-3 w-3" /> Warn
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
      <CheckCircle2 className="h-3 w-3" /> OK
    </Badge>
  );
}

export default function AdminRegionAudit() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<RegionAuditReport | null>(null);

  async function run() {
    setRunning(true);
    try {
      const r = await runRegionAudit();
      setReport(r);
      toast.success(
        `Audited ${r.rows.length} regions — ${r.summary.fail} fail · ${r.summary.warn} warn · ${r.summary.ok} ok`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AdminLayout
      title="REGION CONTENT AUDIT"
      description="Detects thin or duplicate region landing pages and suggests fixes to improve indexing"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Run audit</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Checks each /paintball/&lt;region&gt; page for thin content, low venue/event
                coverage, duplicate intros, and overlapping city lists.
              </p>
            </div>
            <Button onClick={run} disabled={running} className="gap-2">
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              {running ? "Auditing…" : "Run audit"}
            </Button>
          </CardHeader>
          {report && (
            <CardContent className="text-xs text-muted-foreground flex flex-wrap gap-4">
              <span>Last run: {format(parseISO(report.generatedAt), "dd/MM/yyyy HH:mm")}</span>
              <span>Fail: {report.summary.fail}</span>
              <span>Warn: {report.summary.warn}</span>
              <span>OK: {report.summary.ok}</span>
            </CardContent>
          )}
        </Card>

        {report && (
          <div className="space-y-4">
            {report.rows
              .slice()
              .sort((a, b) => {
                const order: Record<AuditSeverity, number> = { fail: 0, warn: 1, ok: 2 };
                return order[a.worstSeverity] - order[b.worstSeverity];
              })
              .map((row) => (
                <Card
                  key={row.region.slug}
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
                          {row.region.name}
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
                          key={`${row.region.slug}-${issue.code}-${idx}`}
                          className={`border-l-2 pl-3 py-1 ${
                            issue.severity === "fail"
                              ? "border-destructive/60"
                              : "border-yellow-500/50"
                          }`}
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

        {!report && (
          <Card>
            <CardContent className="text-sm text-muted-foreground py-6">
              Click "Run audit" to scan all region pages.
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
