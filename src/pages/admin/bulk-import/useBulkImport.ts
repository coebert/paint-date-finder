import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseISO, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useSubmissions } from '@/hooks/useSubmissions';
import type { EventSubmission, SubmissionStatus } from '@/types/submissions';
import { EVENT_TYPE_LABELS } from '@/types/events';
import { dedupeCandidates } from '@/lib/flyerDedupe';
import {
  BulkProgress,
  EditDraft,
  EnrichedRow,
  GroupBy,
  validateSubmission,
} from './types';

export function useBulkImport() {
  const { data: submissions, isLoading } = useSubmissions('pending');
  const qc = useQueryClient();

  const [groupBy, setGroupBy] = useState<GroupBy>('venue');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [submitterFilter, setSubmitterFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    title: '',
    venue_name: '',
    event_date: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [chunkSize, setChunkSize] = useState(25);
  const [progress, setProgress] = useState<BulkProgress | null>(null);

  const startEdit = (s: EventSubmission) => {
    setEditingId(s.id);
    setEditDraft({
      title: s.title ?? '',
      venue_name: s.venue_name ?? '',
      event_date: s.event_date ?? '',
    });
  };
  const cancelEdit = () => setEditingId(null);

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

  const enriched = useMemo<EnrichedRow[]>(
    () => filtered.map((s) => ({ s, issues: validateSubmission(s) })),
    [filtered],
  );

  const groups = useMemo(() => {
    const map = new Map<string, EnrichedRow[]>();
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

  const toggleGroup = (rows: EnrichedRow[], on: boolean) =>
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
      if (totalDuplicates)
        parts.push(`skipped ${totalDuplicates} duplicate${totalDuplicates === 1 ? '' : 's'}`);
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

  return {
    isLoading,
    groupBy,
    setGroupBy,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    submitterFilter,
    setSubmitterFilter,
    selected,
    publishing,
    editingId,
    editDraft,
    setEditDraft,
    savingEdit,
    chunkSize,
    setChunkSize,
    progress,
    enriched,
    groups,
    validIds,
    totalValid,
    totalInvalid,
    selectedValidCount,
    startEdit,
    cancelEdit,
    saveEdit,
    toggle,
    toggleGroup,
    selectAllValid,
    clearSelection,
    publishSelected,
    rejectSelected,
  };
}
