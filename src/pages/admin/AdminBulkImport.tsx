import { useMemo, useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useSubmissions } from '@/hooks/useSubmissions';
import { EventSubmission, SubmissionStatus } from '@/types/submissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle, Layers, Filter, Pencil, Save, X } from 'lucide-react';
import { EVENT_TYPE_LABELS } from '@/types/events';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { dedupeCandidates } from '@/lib/flyerDedupe';

type GroupBy = 'venue' | 'source' | 'event_type';

interface Issue {
  field: string;
  message: string;
}

function validateSubmission(s: EventSubmission): Issue[] {
  const issues: Issue[] = [];
  if (!s.venue_name || s.venue_name.trim().length < 2 || /^unknown/i.test(s.venue_name.trim())) {
    issues.push({ field: 'venue_name', message: 'Missing or unknown venue' });
  }
  if (!s.event_date || !isValid(parseISO(s.event_date))) {
    issues.push({ field: 'event_date', message: 'Missing or invalid date' });
  } else {
    const d = parseISO(s.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) issues.push({ field: 'event_date', message: 'Event is in the past' });
  }
  if (!s.title || s.title.trim().length < 3) {
    issues.push({ field: 'title', message: 'Title too short' });
  }
  return issues;
}

export default function AdminBulkImport() {
  const { data: submissions, isLoading } = useSubmissions('pending');
  const qc = useQueryClient();

  const [groupBy, setGroupBy] = useState<GroupBy>('venue');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [submitterFilter, setSubmitterFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; venue_name: string; event_date: string }>({
    title: '',
    venue_name: '',
    event_date: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [chunkSize, setChunkSize] = useState(25);
  const [progress, setProgress] = useState<{
    total: number;
    processed: number;
    published: number;
    duplicates: number;
    failed: number;
    currentBatch: number;
    totalBatches: number;
  } | null>(null);

  const startEdit = (s: EventSubmission) => {
    setEditingId(s.id);
    setEditDraft({
      title: s.title ?? '',
      venue_name: s.venue_name ?? '',
      event_date: s.event_date ?? '',
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
  };
  const saveEdit = async (id: string) => {
    const title = editDraft.title.trim();
    const venue_name = editDraft.venue_name.trim();
    const event_date = editDraft.event_date;
    if (title.length < 3) return toast.error('Title must be at least 3 characters');
    if (venue_name.length < 2) return toast.error('Venue is required');
    if (!event_date || !isValid(parseISO(event_date))) return toast.error('Valid date required');
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('event_submissions')
        .update({
          title: title.slice(0, 200),
          venue_name: venue_name.slice(0, 200),
          event_date,
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Submission updated');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['submissions'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = useMemo(() => {
    if (!submissions) return [];
    return submissions.filter((s) => {
      if (dateFrom && s.event_date < dateFrom) return false;
      if (dateTo && s.event_date > dateTo) return false;
      if (submitterFilter) {
        const q = submitterFilter.toLowerCase();
        const hay = `${s.submitter_email} ${s.submitter_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, dateFrom, dateTo, submitterFilter]);

  const enriched = useMemo(
    () => filtered.map((s) => ({ s, issues: validateSubmission(s) })),
    [filtered],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof enriched>();
    for (const row of enriched) {
      const key =
        groupBy === 'venue'
          ? (row.s.venue_name?.trim() || 'Unknown venue')
          : groupBy === 'source'
            ? (row.s.source_url?.trim() || 'No source')
            : (EVENT_TYPE_LABELS[row.s.event_type] || 'Other');
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [enriched, groupBy]);

  const validIds = useMemo(
    () => new Set(enriched.filter((r) => r.issues.length === 0).map((r) => r.s.id)),
    [enriched],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleGroup = (rows: typeof enriched, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (r.issues.length > 0) continue;
        on ? next.add(r.s.id) : next.delete(r.s.id);
      }
      return next;
    });

  const selectAllValid = () => setSelected(new Set(validIds));
  const clearSelection = () => setSelected(new Set());

  const publishSelected = async () => {
    const rows = enriched.filter((r) => selected.has(r.s.id) && r.issues.length === 0);
    if (rows.length === 0) {
      toast.error('Select at least one valid submission');
      return;
    }
    const size = Math.max(1, Math.min(100, chunkSize || 25));
    const totalBatches = Math.ceil(rows.length / size);
    setPublishing(true);
    setProgress({
      total: rows.length,
      processed: 0,
      published: 0,
      duplicates: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
    });

    let totalPublished = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;

    try {
      for (let i = 0; i < rows.length; i += size) {
        const batch = rows.slice(i, i + size);
        const batchIndex = Math.floor(i / size) + 1;
        setProgress((p) => (p ? { ...p, currentBatch: batchIndex } : p));

        try {
          const candidates = batch.map((r) => ({
            title: r.s.title,
            description: r.s.description ?? undefined,
            event_type: r.s.event_type,
            event_date: r.s.event_date,
            start_time: r.s.start_time ?? undefined,
            end_time: r.s.end_time ?? undefined,
            price_info: r.s.price_info ?? undefined,
            booking_url: r.s.booking_url ?? undefined,
            venue_name: r.s.venue_name,
            venue_location: r.s.venue_location ?? undefined,
          }));

          const { unique } = await dedupeCandidates(candidates, 'events');
          const uniqueKeys = new Set(
            unique.map((c) => `${c.title}|${c.event_date}|${c.venue_name ?? ''}`),
          );
          const toPublish = batch.filter((r) =>
            uniqueKeys.has(`${r.s.title}|${r.s.event_date}|${r.s.venue_name ?? ''}`),
          );
          const dupRows = batch.filter(
            (r) => !uniqueKeys.has(`${r.s.title}|${r.s.event_date}|${r.s.venue_name ?? ''}`),
          );

          if (toPublish.length > 0) {
            const eventRows = toPublish.map((r) => ({
              title: r.s.title.slice(0, 200),
              description: r.s.description?.slice(0, 2000) ?? null,
              event_type: r.s.event_type,
              venue_name: r.s.venue_name.slice(0, 200),
              venue_location: r.s.venue_location?.slice(0, 200) ?? null,
              event_date: r.s.event_date,
              start_time: r.s.start_time || null,
              end_time: r.s.end_time || null,
              booking_url: r.s.booking_url || null,
              price_info: r.s.price_info?.slice(0, 100) ?? null,
              source_url: r.s.source_url || null,
              is_verified: true,
            }));
            const { error: insertErr } = await supabase.from('events').insert(eventRows);
            if (insertErr) throw insertErr;

            const ids = toPublish.map((r) => r.s.id);
            const { error: updErr } = await supabase
              .from('event_submissions')
              .update({
                status: 'approved' as SubmissionStatus,
                admin_notes: `Bulk imported (batch ${batchIndex}/${totalBatches})`,
                reviewed_at: new Date().toISOString(),
              })
              .in('id', ids);
            if (updErr) throw updErr;
          }

          if (dupRows.length > 0) {
            const ids = dupRows.map((r) => r.s.id);
            await supabase
              .from('event_submissions')
              .update({
                status: 'rejected' as SubmissionStatus,
                admin_notes: 'Bulk: duplicate of existing event',
                reviewed_at: new Date().toISOString(),
              })
              .in('id', ids);
          }

          totalPublished += toPublish.length;
          totalDuplicates += dupRows.length;
        } catch (batchErr) {
          totalFailed += batch.length;
          console.error(`Batch ${batchIndex} failed:`, batchErr);
          toast.error(
            `Batch ${batchIndex}/${totalBatches} failed: ${
              batchErr instanceof Error ? batchErr.message : 'unknown error'
            }`,
          );
        }

        setProgress((p) =>
          p
            ? {
                ...p,
                processed: Math.min(p.total, i + batch.length),
                published: totalPublished,
                duplicates: totalDuplicates,
                failed: totalFailed,
              }
            : p,
        );
      }

      const parts = [`Published ${totalPublished}`];
      if (totalDuplicates) parts.push(`skipped ${totalDuplicates} duplicate${totalDuplicates === 1 ? '' : 's'}`);
      if (totalFailed) parts.push(`${totalFailed} failed`);
      (totalFailed > 0 ? toast.error : toast.success)(parts.join(', '));
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      clearSelection();
    } finally {
      setPublishing(false);
      setTimeout(() => setProgress(null), 4000);
    }
  };

  const rejectSelected = async () => {
    if (selected.size === 0) return;
    setPublishing(true);
    try {
      const { error } = await supabase
        .from('event_submissions')
        .update({
          status: 'rejected' as SubmissionStatus,
          admin_notes: 'Bulk rejected',
          reviewed_at: new Date().toISOString(),
        })
        .in('id', Array.from(selected));
      if (error) throw error;
      toast.success(`Rejected ${selected.size} submission${selected.size === 1 ? '' : 's'}`);
      qc.invalidateQueries({ queryKey: ['submissions'] });
      clearSelection();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk reject failed');
    } finally {
      setPublishing(false);
    }
  };

  const totalValid = validIds.size;
  const totalInvalid = enriched.length - totalValid;
  const selectedValidCount = Array.from(selected).filter((id) => validIds.has(id)).length;

  return (
    <AdminLayout title="Bulk Import" description="Review and publish pending submissions in batches.">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent" />
              Bulk Import Pending Submissions
            </CardTitle>
            <CardDescription>
              Group, filter and publish many flyer submissions to the live calendar at once. Invalid
              rows are flagged and excluded from bulk publish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Group by</Label>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venue">Venue</SelectItem>
                    <SelectItem value="source">Source URL</SelectItem>
                    <SelectItem value="event_type">Event type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date from</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date to</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label className="text-xs">Submitter (name or email)</Label>
                <Input
                  placeholder="e.g. john@example.com"
                  value={submitterFilter}
                  onChange={(e) => setSubmitterFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="outline" className="gap-1">
                <Filter className="h-3 w-3" /> {enriched.length} shown
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {totalValid} valid
              </Badge>
              {totalInvalid > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {totalInvalid} need editing
                </Badge>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="chunk-size" className="text-xs whitespace-nowrap">
                    Batch size
                  </Label>
                  <Select
                    value={String(chunkSize)}
                    onValueChange={(v) => setChunkSize(Number(v))}
                    disabled={publishing}
                  >
                    <SelectTrigger id="chunk-size" className="h-8 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={selectAllValid} disabled={publishing}>
                  Select all valid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={publishing || selected.size === 0}
                >
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={rejectSelected}
                  disabled={publishing || selected.size === 0}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject ({selected.size})
                </Button>
                <Button
                  size="sm"
                  onClick={publishSelected}
                  disabled={publishing || selectedValidCount === 0}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Publish {selectedValidCount} to calendar
                </Button>
              </div>
            </div>

            {progress && (
              <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {publishing
                      ? `Publishing batch ${progress.currentBatch} of ${progress.totalBatches}…`
                      : 'Bulk publish complete'}
                  </span>
                  <span className="text-muted-foreground">
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <Progress
                  value={progress.total ? (progress.processed / progress.total) * 100 : 0}
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {progress.published} published
                  </Badge>
                  {progress.duplicates > 0 && (
                    <Badge variant="outline" className="gap-1">
                      {progress.duplicates} duplicates skipped
                    </Badge>
                  )}
                  {progress.failed > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> {progress.failed} failed
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {totalInvalid > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{totalInvalid} submission(s) flagged</AlertTitle>
            <AlertDescription>
              Rows with missing venues, missing/past dates, or short titles are excluded from bulk
              publish. Edit them individually on the{' '}
              <a href="/admin/submissions" className="underline">
                Submissions
              </a>{' '}
              page.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending submissions match these filters.
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {groups.map(([groupKey, rows]) => {
              const validInGroup = rows.filter((r) => r.issues.length === 0);
              const allSelected =
                validInGroup.length > 0 && validInGroup.every((r) => selected.has(r.s.id));
              return (
                <AccordionItem key={groupKey} value={groupKey} className="border rounded-lg bg-card">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <span className="font-medium truncate max-w-md">{groupKey}</span>
                      <Badge variant="secondary">{rows.length}</Badge>
                      {rows.some((r) => r.issues.length > 0) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {rows.filter((r) => r.issues.length > 0).length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-2">
                    {validInGroup.length > 0 && (
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(c) => toggleGroup(rows, !!c)}
                        />
                        <span className="text-xs text-muted-foreground">
                          Select all {validInGroup.length} valid in this group
                        </span>
                      </div>
                    )}
                    {rows.map(({ s, issues }) => {
                      const invalid = issues.length > 0;
                      const dateStr = isValid(parseISO(s.event_date))
                        ? format(parseISO(s.event_date), 'dd/MM/yyyy')
                        : s.event_date || '—';
                      const isEditing = editingId === s.id;
                      return (
                        <div
                          key={s.id}
                          className={`flex items-start gap-3 p-3 rounded-md border ${
                            invalid ? 'border-destructive/40 bg-destructive/5' : 'border-border/50'
                          }`}
                        >
                          <Checkbox
                            className="mt-1"
                            disabled={invalid || isEditing}
                            checked={selected.has(s.id)}
                            onCheckedChange={() => toggle(s.id)}
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs">Title</Label>
                                    <Input
                                      value={editDraft.title}
                                      onChange={(e) =>
                                        setEditDraft((d) => ({ ...d, title: e.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Venue</Label>
                                    <Input
                                      value={editDraft.venue_name}
                                      onChange={(e) =>
                                        setEditDraft((d) => ({ ...d, venue_name: e.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Date</Label>
                                    <Input
                                      type="date"
                                      value={editDraft.event_date}
                                      onChange={(e) =>
                                        setEditDraft((d) => ({ ...d, event_date: e.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    onClick={() => saveEdit(s.id)}
                                    disabled={savingEdit}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    disabled={savingEdit}
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">{s.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {s.event_type}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {dateStr}
                                  </Badge>
                                  {s.start_time && (
                                    <span className="text-xs text-muted-foreground">
                                      {s.start_time.slice(0, 5)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {s.venue_name}
                                  {s.venue_location ? ` · ${s.venue_location}` : ''}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  From {s.submitter_name || s.submitter_email}
                                  {s.source_url && (
                                    <>
                                      {' · '}
                                      <a
                                        href={s.source_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline"
                                      >
                                        source
                                      </a>
                                    </>
                                  )}
                                </div>
                                {invalid && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {issues.map((i) => (
                                      <Badge
                                        key={i.field}
                                        variant="destructive"
                                        className="text-[10px]"
                                      >
                                        {i.message}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {!isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(s)}
                              disabled={publishing}
                              className="shrink-0"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </AdminLayout>
  );
}
