import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCcw, ExternalLink, XCircle, HelpCircle } from "lucide-react";
import { ALL_REGIONS } from "@/lib/regions";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const SITE = "https://findawalkon.com";

interface InspectResult {
  url: string;
  label: string;
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  lastCrawlTime: string | null;
  pageFetchState: string | null;
  robotsTxtState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  referringUrls: string[] | null;
  mobileVerdict: string | null;
  richResultsVerdict: string | null;
  error: string | null;
}

interface Response {
  checkedAt: string;
  results: InspectResult[];
}

function VerdictBadge({ verdict, error }: { verdict: string | null; error: string | null }) {
  if (error) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Error
      </Badge>
    );
  }
  if (!verdict) {
    return (
      <Badge variant="outline" className="gap-1">
        <HelpCircle className="h-3 w-3" /> Unknown
      </Badge>
    );
  }
  if (verdict === "PASS") {
    return (
      <Badge className="gap-1 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
        <CheckCircle2 className="h-3 w-3" /> Indexed
      </Badge>
    );
  }
  if (verdict === "PARTIAL") {
    return (
      <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-500">
        <AlertTriangle className="h-3 w-3" /> Partial
      </Badge>
    );
  }
  if (verdict === "FAIL") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Fail
      </Badge>
    );
  }
  return <Badge variant="outline">{verdict}</Badge>;
}

export default function AdminGscRegions() {
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<Response | null>(null);

  const targets = useMemo(
    () => [
      { url: `${SITE}/paintball`, label: "Regions hub" },
      ...ALL_REGIONS.map((r) => ({ url: `${SITE}/paintball/${r.slug}`, label: r.name })),
    ],
    [],
  );

  const errors = data?.results.filter((r) => r.error || r.verdict === "FAIL") ?? [];
  const partial = data?.results.filter((r) => r.verdict === "PARTIAL") ?? [];

  async function runCheck() {
    setRunning(true);
    try {
      const { data: res, error } = await supabase.functions.invoke<Response>(
        "gsc-region-index",
        { body: { urls: targets } },
      );
      if (error) throw error;
      if (!res) throw new Error("Empty response");
      setData(res);
      toast.success(`Checked ${res.results.length} URLs`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to run check");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AdminLayout
      title="GSC REGION INDEXING"
      description="Live Google Search Console coverage for the /paintball region landing pages"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Run check</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Inspects {targets.length} URLs via the Search Console URL Inspection API.
                Results reflect Google's last crawl, not a fresh fetch.
              </p>
            </div>
            <Button onClick={runCheck} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {running ? "Checking…" : "Refresh status"}
            </Button>
          </CardHeader>
          {data && (
            <CardContent className="text-xs text-muted-foreground">
              Last checked: {format(parseISO(data.checkedAt), "dd/MM/yyyy HH:mm 'UTC'")}
            </CardContent>
          )}
        </Card>

        {data && (errors.length > 0 || partial.length > 0) && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {errors.length} error{errors.length === 1 ? "" : "s"} · {partial.length} warning{partial.length === 1 ? "" : "s"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[...errors, ...partial].map((r) => (
                <div key={r.url} className="border-l-2 border-destructive/60 pl-3">
                  <div className="font-medium">{r.label}</div>
                  <div className="text-muted-foreground text-xs">{r.url}</div>
                  <div className="text-xs mt-1">
                    {r.error
                      ? r.error
                      : `Coverage: ${r.coverageState ?? "—"} · Indexing: ${r.indexingState ?? "—"} · Fetch: ${r.pageFetchState ?? "—"}`}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All region URLs</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 pr-3">Page</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2 pr-3">Coverage</th>
                  <th className="text-left py-2 pr-3">Indexing</th>
                  <th className="text-left py-2 pr-3">Mobile</th>
                  <th className="text-left py-2 pr-3">Last crawl</th>
                  <th className="text-left py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(data?.results ?? targets.map((t) => ({
                  ...t,
                  verdict: null, coverageState: null, indexingState: null, lastCrawlTime: null,
                  pageFetchState: null, robotsTxtState: null, googleCanonical: null,
                  userCanonical: null, referringUrls: null, mobileVerdict: null,
                  richResultsVerdict: null, error: null,
                } as InspectResult))).map((r) => (
                  <tr key={r.url} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[280px]">{r.url}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <VerdictBadge verdict={r.verdict} error={r.error} />
                    </td>
                    <td className="py-2 pr-3 text-xs">{r.coverageState ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">{r.indexingState ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">{r.mobileVerdict ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">
                      {r.lastCrawlTime ? format(parseISO(r.lastCrawlTime), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="py-2">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex"
                        aria-label={`Open ${r.label}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data && (
              <p className="text-xs text-muted-foreground mt-3">
                Click "Refresh status" above to fetch live data from Google Search Console.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
