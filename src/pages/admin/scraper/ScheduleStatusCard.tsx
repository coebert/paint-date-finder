import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlarmClock,
  CheckCircle2,
  History,
  Loader2,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useResumeScrapeJob, useRunScrape, useScrapeJobState } from '@/hooks/useScraper';

function relative(iso: string | null | undefined) {
  if (!iso) return 'never';
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

const BACKFILL_DAY_OPTIONS = ['1', '3', '7', '14', '30'];

/**
 * Status of the scheduled (background) scraper job: when it last ran, whether
 * a run is currently holding the lease, and whether the circuit breaker has
 * paused it (AI credits exhausted or blocked by workspace policy).
 */
export function ScheduleStatusCard() {
  const { data: job, isLoading } = useScrapeJobState({ refetchInterval: 30000 });
  const resume = useResumeScrapeJob();
  const runScrape = useRunScrape();
  const [backfillDays, setBackfillDays] = useState('7');

  const running = !!job?.lease_expires_at && new Date(job.lease_expires_at) > new Date();


  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <AlarmClock className="h-4 w-4 text-accent" aria-hidden />
            Automatic schedule
          </CardTitle>
          <CardDescription>
            Runs daily at 05:10 UK time, scraping a small batch of the least-recently
            checked sources so every source is refreshed in rotation.
          </CardDescription>
        </div>
        {job?.paused ? (
          <Button
            size="sm"
            onClick={() => resume.mutate()}
            disabled={resume.isPending}
            className="min-h-11"
          >
            {resume.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Resume job
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <p className="text-muted-foreground">Loading schedule status…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {job?.paused ? (
                <Badge variant="destructive" className="gap-1">
                  <PauseCircle className="h-3 w-3" aria-hidden />
                  Paused
                  {job.paused_kind ? ` (${job.paused_kind.replace('_', ' ')})` : ''}
                </Badge>
              ) : running ? (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Run in progress
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  Scheduled
                </Badge>
              )}
              <span className="text-muted-foreground">
                Last started {relative(job?.last_run_at)} · last finished{' '}
                {relative(job?.last_finished_at)}
              </span>
            </div>

            {job?.paused ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
                The scheduled scraper stopped itself {relative(job.paused_at)}:{' '}
                <span className="font-medium">{job.pause_reason || 'unknown reason'}</span>.
                {job.paused_kind === 'credits'
                  ? ' Top up AI credits (or lift the workspace limit), then resume — a single test source is retried on each scheduled run until it succeeds.'
                  : ' It will retry automatically on the next scheduled run.'}
              </p>
            ) : null}

            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="flex items-center gap-2 font-medium">
                <History className="h-4 w-4 text-accent" aria-hidden />
                Catch up on missed runs
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Re-scrapes every active source that hasn't been checked in the chosen
                window and adds anything new to the calendar. Events and pending
                submissions that already exist are merged, never duplicated.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={backfillDays} onValueChange={setBackfillDays}>
                  <SelectTrigger className="h-11 w-[150px]" aria-label="Backfill window">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKFILL_DAY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        Last {d} {d === '1' ? 'day' : 'days'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-11"
                  disabled={runScrape.isPending || running}
                  onClick={() =>
                    runScrape.mutate({ backfillDays: Number(backfillDays) })
                  }
                >
                  {runScrape.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <History className="mr-2 h-4 w-4" />
                  )}
                  Run backfill
                </Button>
              </div>
            </div>

          </>
        )}
      </CardContent>
    </Card>
  );
}
