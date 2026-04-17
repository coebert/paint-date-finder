import { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  useTrustedSources,
  useUpsertTrustedSource,
  type TrustedSource,
} from "@/hooks/useScraper";
import { Loader2, Play, Plus, Trash2, ExternalLink, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  const upsert = useUpsertTrustedSource();

  const onSave = async () => {
    if (!venueName.trim() || !url.trim()) return;
    await upsert.mutateAsync({
      id: source?.id,
      venue_name: venueName.trim(),
      url: url.trim(),
      notes: notes.trim() || null,
      is_active: active,
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
            <Label>Venue name</Label>
            <Input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. Mayhem Paintball"
            />
          </div>
          <div className="space-y-1">
            <Label>URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://venue.example/events"
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

export default function AdminScraper() {
  const { data: sources = [], isLoading } = useTrustedSources();
  const { data: runs = [] } = useScrapeRuns();
  const remove = useDeleteTrustedSource();
  const runScrape = useRunScrape();

  return (
    <AdminLayout
      title="Auto-Scraper"
      description="Scrape trusted venue websites weekly and queue new candidate events for review."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Trusted sources</CardTitle>
              <CardDescription>
                URLs scraped automatically every Monday at 06:00 UTC.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
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
              <SourceDialog
                trigger={
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add source
                  </Button>
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : sources.length === 0 ? (
              <p className="text-muted-foreground">
                No sources yet. Add a venue URL to get started.
              </p>
            ) : (
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
                        {s.venue_name}
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
                            <span
                              className="max-w-[220px] truncate text-xs text-destructive"
                              title={s.last_error_message}
                            >
                              {s.last_error_message}
                            </span>
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>
              Last 20 scraper executions. Candidates land in Submissions for
              review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-muted-foreground">No runs yet.</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
