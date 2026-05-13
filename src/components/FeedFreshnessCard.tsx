import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const SCRAPE_STALE_HOURS = 72;
const UPDATE_STALE_HOURS = 168;
const STALE_EVENT_DAYS = 60;

interface Freshness {
  lastScrapeAt: string | null;
  lastUpdateAt: string | null;
  staleCount: number;
}

function ageHrs(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

function statusFor(scrapeAge: number, updateAge: number): { label: string; tone: "ok" | "warn" | "bad" } {
  if (scrapeAge > SCRAPE_STALE_HOURS || updateAge > UPDATE_STALE_HOURS) {
    return { label: "Stale", tone: "bad" };
  }
  if (scrapeAge > SCRAPE_STALE_HOURS / 2 || updateAge > UPDATE_STALE_HOURS / 2) {
    return { label: "Aging", tone: "warn" };
  }
  return { label: "Fresh", tone: "ok" };
}

export function FeedFreshnessCard() {
  const [data, setData] = useState<Freshness | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    const staleCutoff = new Date(Date.now() - STALE_EVENT_DAYS * 86400000).toISOString();
    const [{ data: scrape }, { data: ev }, { count }] = await Promise.all([
      supabase
        .from("scrape_runs")
        .select("finished_at, started_at")
        .eq("status", "success")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("events")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .lt("updated_at", staleCutoff),
    ]);

    setData({
      lastScrapeAt: scrape?.finished_at ?? scrape?.started_at ?? null,
      lastUpdateAt: ev?.updated_at ?? null,
      staleCount: count ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function runCheck() {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("feed-freshness-monitor");
      if (error) throw error;
      toast.success("Freshness check complete");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check failed");
    } finally {
      setRunning(false);
    }
  }

  const scrapeAge = ageHrs(data?.lastScrapeAt ?? null);
  const updateAge = ageHrs(data?.lastUpdateAt ?? null);
  const status = statusFor(scrapeAge, updateAge);
  const toneClass =
    status.tone === "ok"
      ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
      : status.tone === "warn"
        ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
        : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Feed Freshness
        </CardTitle>
        <Activity className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={toneClass}>
            {loading ? "…" : status.label}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={runCheck}
            disabled={running}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${running ? "animate-spin" : ""}`} />
            Check now
          </Button>
        </div>
        <div className="text-xs space-y-1.5 text-muted-foreground">
          <div className="flex justify-between gap-2">
            <span>Last scrape</span>
            <span className="text-foreground">
              {data?.lastScrapeAt
                ? formatDistanceToNow(new Date(data.lastScrapeAt), { addSuffix: true })
                : "never"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Last event update</span>
            <span className="text-foreground">
              {data?.lastUpdateAt
                ? formatDistanceToNow(new Date(data.lastUpdateAt), { addSuffix: true })
                : "never"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Stale events ({STALE_EVENT_DAYS}d+)</span>
            <span className="text-foreground">{data?.staleCount ?? 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
