import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Loader2, Pencil, Play, Plus, RotateCcw, Trash2, Inbox } from 'lucide-react';
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
import {
  useDeleteTrustedSource,
  useRunScrape,
  useSetTrustedSourceActive,
  useTrustedSources,
  type TrustedSource,
} from '@/hooks/useScraper';
import { SourceDialog } from './SourceDialog';
import {
  EmptyState,
  ErrorDetails,
  ErrorState,
  SourcesSkeleton,
  StatusBadge,
} from './parts';

/** Mobile card row for one trusted source. */
function SourceMobileCard({ s }: { s: TrustedSource }) {
  const remove = useDeleteTrustedSource();
  const setActive = useSetTrustedSourceActive();
  return (
    <li className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{s.venue_name}</div>
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-xs text-accent hover:underline break-all"
          >
            <span className="truncate">{s.url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SourceDialog
            source={s}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (confirm(`Remove ${s.venue_name}?`)) remove.mutate(s.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {s.is_active ? (
          <Badge variant="outline" className="text-[10px]">on</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">off</Badge>
        )}
        <StatusBadge status={s.last_status} />
        {s.source_type === 'facebook_group' ? (
          <Badge variant="outline" className="text-[10px]">FB group</Badge>
        ) : null}
        {s.last_used_firecrawl ? (
          <Badge variant="outline" className="text-[10px]">firecrawl</Badge>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">
        {s.last_scraped_at
          ? `Last scraped ${formatDistanceToNow(new Date(s.last_scraped_at), { addSuffix: true })}`
          : 'Never scraped'}
      </div>
      {s.last_scraped_at ? (
        <div className="text-xs tabular-nums">
          <span className="text-muted-foreground">returned</span>{' '}
          <span className="font-medium">{s.last_returned ?? 0}</span>
          {' · '}
          <span className="text-muted-foreground">inserted</span>{' '}
          <span className="font-medium text-accent">{s.last_inserted ?? 0}</span>
          {' · '}
          <span className="text-muted-foreground">deduped</span>{' '}
          <span className="font-medium">{s.last_deduped ?? 0}</span>
          {(s.last_invalid_date ?? 0) > 0 ? (
            <>
              {' · '}
              <span className="text-muted-foreground">invalid</span>{' '}
              <span className="font-medium">{s.last_invalid_date}</span>
            </>
          ) : null}
        </div>
      ) : null}
      {s.last_error_message ? <ErrorDetails message={s.last_error_message} /> : null}
      {s.source_type === 'facebook_group' && !s.is_active ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1"
          disabled={setActive.isPending}
          onClick={() => setActive.mutate({ id: s.id, is_active: true })}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Re-enable
        </Button>
      ) : null}
    </li>
  );
}

/** Desktop table row for one trusted source. */
function SourceTableRow({ s }: { s: TrustedSource }) {
  const remove = useDeleteTrustedSource();
  const setActive = useSetTrustedSourceActive();
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex flex-col gap-1">
          <span>{s.venue_name}</span>
          {s.source_type === 'facebook_group' ? (
            <Badge variant="outline" className="w-fit text-[10px]">
              FB group · multi-venue
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="max-w-[280px] truncate">
        <a
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          {s.url}
          <ExternalLink className="h-3 w-3" />
        </a>
      </TableCell>
      <TableCell>
        {s.is_active ? <Badge variant="outline">on</Badge> : <Badge variant="secondary">off</Badge>}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {s.last_scraped_at
          ? formatDistanceToNow(new Date(s.last_scraped_at), { addSuffix: true })
          : 'never'}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <StatusBadge status={s.last_status} />
          {s.last_used_firecrawl ? (
            <Badge variant="outline" className="w-fit text-[10px]">firecrawl</Badge>
          ) : null}
          {s.last_error_message ? <ErrorDetails message={s.last_error_message} /> : null}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {s.last_scraped_at ? (
          <div className="flex flex-col items-end text-xs">
            <span>
              <span className="text-muted-foreground">returned</span>{' '}
              <span className="font-medium">{s.last_returned ?? 0}</span>
              {' · '}
              <span className="text-muted-foreground">inserted</span>{' '}
              <span className="font-medium text-accent">{s.last_inserted ?? 0}</span>
            </span>
            <span className="text-muted-foreground">
              deduped {s.last_deduped ?? 0}
              {(s.last_invalid_date ?? 0) > 0 ? ` · invalid ${s.last_invalid_date}` : ''}
              {s.last_chars != null ? ` · ${s.last_chars.toLocaleString()} chars` : ''}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {s.source_type === 'facebook_group' && !s.is_active ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={setActive.isPending}
              onClick={() => setActive.mutate({ id: s.id, is_active: true })}
              title="Re-enable this Facebook group source"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-enable
            </Button>
          ) : null}
          <SourceDialog
            source={s}
            trigger={
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Remove ${s.venue_name}?`)) remove.mutate(s.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TrustedSourcesCard() {
  const {
    data: sources = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTrustedSources();
  const runScrape = useRunScrape();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle>Trusted sources</CardTitle>
          <CardDescription>URLs scraped automatically every Monday at 06:00 UTC.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button
            onClick={() => runScrape.mutate()}
            disabled={runScrape.isPending || sources.length === 0}
            className="flex-1 sm:flex-none"
          >
            {runScrape.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run scrape now
          </Button>
          <SourceDialog
            trigger={
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                Add source
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <SourcesSkeleton />
        ) : isError ? (
          <ErrorState
            title="Couldn't load trusted sources"
            message={
              error instanceof Error
                ? error.message
                : 'An unknown error occurred while fetching sources.'
            }
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : sources.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No trusted sources yet"
            description="Add a venue website or Facebook group URL and the scraper will queue candidate events for review every Monday."
            action={
              <SourceDialog
                trigger={
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first source
                  </Button>
                }
              />
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3 md:hidden">
              {sources.map((s) => (
                <SourceMobileCard key={s.id} s={s} />
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Last scraped</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Last run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((s) => (
                    <SourceTableRow key={s.id} s={s} />
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
