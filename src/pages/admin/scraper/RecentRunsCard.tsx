import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { History, Loader2, Play, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isRunInFlight, useRunScrape, useScrapeRuns, useTrustedSources } from '@/hooks/useScraper';
import { EmptyState, ErrorState, RunsSkeleton, StatusBadge } from './parts';

/**
 * Recent scraper runs card. Polls every 3s while a run is in-flight, 30s
 * otherwise, so newly scheduled cron runs surface without a manual reload.
 */
export function RecentRunsCard() {
  const [hasInFlightRun, setHasInFlightRun] = useState(false);
  const runScrape = useRunScrape();
  const pollInterval = hasInFlightRun || runScrape.isPending ? 3000 : 30000;

  const {
    data: runs = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useScrapeRuns({ refetchInterval: pollInterval });

  const { data: sources = [] } = useTrustedSources();

  useEffect(() => {
    setHasInFlightRun(runs.some(isRunInFlight));
  }, [runs]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            Recent runs
            {hasInFlightRun || runScrape.isPending ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent"
                role="status"
                aria-live="polite"
              >
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Live
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            Last 20 scraper executions. Candidates land in Submissions for review.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {dataUpdatedAt ? (
            <span title={new Date(dataUpdatedAt).toLocaleString()}>
              Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh runs"
            title="Refresh now"
          >
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <RunsSkeleton />
        ) : isError ? (
          <ErrorState
            title="Couldn't load recent runs"
            message={
              error instanceof Error
                ? error.message
                : 'An unknown error occurred while fetching run history.'
            }
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No runs yet"
            description="When the weekly scrape kicks off — or you click 'Run scrape now' — execution results will appear here."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => runScrape.mutate()}
                disabled={runScrape.isPending || sources.length === 0}
              >
                {runScrape.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Run scrape now
              </Button>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-2 md:hidden">
              {runs.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border/60 bg-card/50 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {r.triggered_by}
                      </Badge>
                      <span>{r.sources_processed} sources</span>
                      <span>·</span>
                      <span>{r.candidates_created} candidates</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={r.status} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Sources</TableHead>
                    <TableHead>Candidates</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.triggered_by}</Badge>
                      </TableCell>
                      <TableCell>{r.sources_processed}</TableCell>
                      <TableCell>{r.candidates_created}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
