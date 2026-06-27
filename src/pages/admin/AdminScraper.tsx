import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useDeleteTrustedSource,
  useRunScrape,
  useScrapeRuns,
  isRunInFlight,

  useSetTrustedSourceActive,
  useTrustedSources,
  useUpsertTrustedSource,
  type TrustedSource,
} from "@/hooks/useScraper";
import { Loader2, Play, Plus, Trash2, ExternalLink, Pencil, RotateCcw, AlertCircle, Inbox, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AdminFlyerImportCard } from "@/components/admin/AdminFlyerImportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


function SourceDialog({
  trigger,
  source,
}: {
  trigger: React.ReactNode;
  source?: TrustedSource;
}) {
  const [open, setOpen] = useState(false);
  const [venueName, setVenueName] = useState(source?.venue_name ?? "");
  const [url, setUrl] = useState(source?.url ?? "");
  const [notes, setNotes] = useState(source?.notes ?? "");
  const [active, setActive] = useState(source?.is_active ?? true);
  const [sourceType, setSourceType] = useState<"venue" | "facebook_group">(
    source?.source_type ?? "venue",
  );
  const upsert = useUpsertTrustedSource();

  const isGroup = sourceType === "facebook_group";

  const onSave = async () => {
    if (!venueName.trim() || !url.trim()) return;
    await upsert.mutateAsync({
      id: source?.id,
      venue_name: venueName.trim(),
      url: url.trim(),
      notes: notes.trim() || null,
      is_active: active,
      source_type: sourceType,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {source ? "Edit source" : "Add trusted source"}
          </DialogTitle>
          <DialogDescription>
            URLs added here are scraped weekly. Candidates are sent to the
            Submissions queue for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Source type</Label>
            <Select
              value={sourceType}
              onValueChange={(v) => setSourceType(v as "venue" | "facebook_group")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="venue">Venue website</SelectItem>
                <SelectItem value="facebook_group">
                  Facebook group (multi-venue)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isGroup
                ? "Posts in this group may advertise events at many different venues. The AI will extract the venue name from each post."
                : "All events on this page belong to a single venue."}
            </p>
          </div>
          <div className="space-y-1">
            <Label>{isGroup ? "Group name" : "Venue name"}</Label>
            <Input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder={
                isGroup
                  ? "e.g. UK Paintball Walk-Ons"
                  : "e.g. Mayhem Paintball"
              }
            />
          </div>
          <div className="space-y-1">
            <Label>URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                isGroup
                  ? "https://www.facebook.com/groups/..."
                  : "https://venue.example/events"
              }
              type="url"
            />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything useful about this page"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} id="active" />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={upsert.isPending}>
            {upsert.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function statusBadge(status: string | null) {
  if (!status) return <Badge variant="outline">—</Badge>;
  if (status === "ok" || status === "success")
    return <Badge className="bg-accent text-accent-foreground">{status}</Badge>;
  if (status === "partial")
    return <Badge className="bg-secondary text-secondary-foreground">{status}</Badge>;
  return <Badge variant="destructive">{status}</Badge>;
}

// Extract an HTTP status code from a free-text error message, e.g.
// "Firecrawl 403: {...}" or "fetch failed: 502 Bad Gateway".
function extractHttpStatus(msg: string | null): number | null {
  if (!msg) return null;
  const m = msg.match(/\b(?:status\s*[:=]?\s*)?(\d{3})\b/);
  if (!m) return null;
  const code = Number(m[1]);
  return code >= 100 && code <= 599 ? code : null;
}

function ErrorDetails({ message }: { message: string }) {
  const status = extractHttpStatus(message);
  const onCopy = () => {
    void navigator.clipboard?.writeText(message);
  };
  return (
    <div className="mt-1 w-full max-w-[420px] rounded border border-destructive/30 bg-destructive/5 p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Badge variant="destructive" className="text-[10px]">
            error
          </Badge>
          {status ? (
            <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
              HTTP {status}
            </Badge>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          copy
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-destructive">
        {message}
      </pre>
    </div>
  );
}

function SourcesSkeleton() {
  return (
    <>
      {/* Mobile skeleton list */}
      <ul className="flex flex-col gap-3 md:hidden" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-10 rounded-full" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-1/2" />
          </li>
        ))}
      </ul>
      {/* Desktop skeleton rows */}
      <div className="hidden md:block space-y-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border/40 last:border-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">Loading trusted sources…</span>
    </>
  );
}

function RunsSkeleton() {
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="rounded-lg border border-border/60 bg-card/50 p-3 flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </li>
        ))}
      </ul>
      <div className="hidden md:block space-y-2" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border/40 last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">Loading recent runs…</span>
    </>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
  isRetrying,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <Alert variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="break-words">{message}</AlertDescription>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="self-start sm:self-auto shrink-0"
      >
        {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
        Retry
      </Button>
    </Alert>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Inbox;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default function AdminScraper() {
  const {
    data: sources = [],
    isLoading: sourcesLoading,
    isError: sourcesError,
    error: sourcesErrorObj,
    refetch: refetchSources,
    isFetching: sourcesFetching,
  } = useTrustedSources();
  // Poll the runs list. While a run is in-flight (or one was just triggered)
  // refresh every 3s so the user sees status & counts update in near-real-time.
  // Otherwise idle-poll every 30s so a freshly created cron run appears without
  // a manual reload.
  const [hasInFlightRun, setHasInFlightRun] = useState(false);
  const runScrape = useRunScrape();
  const pollInterval = hasInFlightRun || runScrape.isPending ? 3000 : 30000;

  const {
    data: runs = [],
    isLoading: runsLoading,
    isError: runsError,
    error: runsErrorObj,
    refetch: refetchRuns,
    isFetching: runsFetching,
    dataUpdatedAt: runsUpdatedAt,
  } = useScrapeRuns({ refetchInterval: pollInterval });
  const remove = useDeleteTrustedSource();
  const setActive = useSetTrustedSourceActive();

  useEffect(() => {
    setHasInFlightRun(runs.some(isRunInFlight));
  }, [runs]);



  return (
    <AdminLayout
      title="Auto-Scraper"
      description="Scrape trusted venue websites weekly and queue new candidate events for review."
    >
      <div className="space-y-6">
        <AdminFlyerImportCard />
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Trusted sources</CardTitle>
              <CardDescription>
                URLs scraped automatically every Monday at 06:00 UTC.
              </CardDescription>
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
            {sourcesLoading ? (
              <SourcesSkeleton />
            ) : sourcesError ? (
              <ErrorState
                title="Couldn't load trusted sources"
                message={sourcesErrorObj instanceof Error ? sourcesErrorObj.message : "An unknown error occurred while fetching sources."}
                onRetry={() => refetchSources()}
                isRetrying={sourcesFetching}
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
                {/* Mobile: card list */}
                <ul className="flex flex-col gap-3 md:hidden">
                  {sources.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2"
                    >
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
                              if (confirm(`Remove ${s.venue_name}?`))
                                remove.mutate(s.id);
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
                        {statusBadge(s.last_status)}
                        {s.source_type === "facebook_group" ? (
                          <Badge variant="outline" className="text-[10px]">
                            FB group
                          </Badge>
                        ) : null}
                        {s.last_used_firecrawl ? (
                          <Badge variant="outline" className="text-[10px]">
                            firecrawl
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.last_scraped_at
                          ? `Last scraped ${formatDistanceToNow(new Date(s.last_scraped_at), { addSuffix: true })}`
                          : "Never scraped"}
                      </div>
                      {s.last_scraped_at ? (
                        <div className="text-xs tabular-nums">
                          <span className="text-muted-foreground">returned</span>{" "}
                          <span className="font-medium">{s.last_returned ?? 0}</span>
                          {" · "}
                          <span className="text-muted-foreground">inserted</span>{" "}
                          <span className="font-medium text-accent">{s.last_inserted ?? 0}</span>
                          {" · "}
                          <span className="text-muted-foreground">deduped</span>{" "}
                          <span className="font-medium">{s.last_deduped ?? 0}</span>
                          {(s.last_invalid_date ?? 0) > 0 ? (
                            <>
                              {" · "}
                              <span className="text-muted-foreground">invalid</span>{" "}
                              <span className="font-medium">{s.last_invalid_date}</span>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      {s.last_error_message ? (
                        <ErrorDetails message={s.last_error_message} />
                      ) : null}
                      {s.source_type === "facebook_group" && !s.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1"
                          disabled={setActive.isPending}
                          onClick={() =>
                            setActive.mutate({ id: s.id, is_active: true })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Re-enable
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {/* Desktop: full table */}
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
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <span>{s.venue_name}</span>
                              {s.source_type === "facebook_group" ? (
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
                            {s.is_active ? (
                              <Badge variant="outline">on</Badge>
                            ) : (
                              <Badge variant="secondary">off</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {s.last_scraped_at
                              ? formatDistanceToNow(new Date(s.last_scraped_at), {
                                  addSuffix: true,
                                })
                              : "never"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {statusBadge(s.last_status)}
                              {s.last_used_firecrawl ? (
                                <Badge variant="outline" className="w-fit text-[10px]">
                                  firecrawl
                                </Badge>
                              ) : null}
                              {s.last_error_message ? (
                                <ErrorDetails message={s.last_error_message} />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.last_scraped_at ? (
                              <div className="flex flex-col items-end text-xs">
                                <span>
                                  <span className="text-muted-foreground">returned</span>{" "}
                                  <span className="font-medium">{s.last_returned ?? 0}</span>
                                  {" · "}
                                  <span className="text-muted-foreground">inserted</span>{" "}
                                  <span className="font-medium text-accent">
                                    {s.last_inserted ?? 0}
                                  </span>
                                </span>
                                <span className="text-muted-foreground">
                                  deduped {s.last_deduped ?? 0}
                                  {(s.last_invalid_date ?? 0) > 0
                                    ? ` · invalid ${s.last_invalid_date}`
                                    : ""}
                                  {s.last_chars != null
                                    ? ` · ${s.last_chars.toLocaleString()} chars`
                                    : ""}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {s.source_type === "facebook_group" && !s.is_active ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1"
                                  disabled={setActive.isPending}
                                  onClick={() =>
                                    setActive.mutate({ id: s.id, is_active: true })
                                  }
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
                                  if (confirm(`Remove ${s.venue_name}?`))
                                    remove.mutate(s.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
              {runsUpdatedAt ? (
                <span title={new Date(runsUpdatedAt).toLocaleString()}>
                  Updated {formatDistanceToNow(new Date(runsUpdatedAt), { addSuffix: true })}
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetchRuns()}
                disabled={runsFetching}
                aria-label="Refresh runs"
                title="Refresh now"
              >
                {runsFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            {runsLoading ? (
              <RunsSkeleton />
            ) : runsError ? (
              <ErrorState
                title="Couldn't load recent runs"
                message={runsErrorObj instanceof Error ? runsErrorObj.message : "An unknown error occurred while fetching run history."}
                onRetry={() => refetchRuns()}
                isRetrying={runsFetching}
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
                {/* Mobile cards */}
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
                          <Badge variant="outline" className="text-[10px]">{r.triggered_by}</Badge>
                          <span>{r.sources_processed} sources</span>
                          <span>·</span>
                          <span>{r.candidates_created} candidates</span>
                        </div>
                      </div>
                      <div className="shrink-0">{statusBadge(r.status)}</div>
                    </li>
                  ))}
                </ul>

                {/* Desktop table */}
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
                            {formatDistanceToNow(new Date(r.started_at), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.triggered_by}</Badge>
                          </TableCell>
                          <TableCell>{r.sources_processed}</TableCell>
                          <TableCell>{r.candidates_created}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

