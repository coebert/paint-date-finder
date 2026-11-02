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
    () =>
      filtered.map((s) => ({
        s,
        // Bulk publishing is limited to suggestions whose excerpt and exact
        // date were found on the fetched source; everything else is reviewed one by one.
        issues: [
          ...validateSubmission(s),
          ...(s.evidence_status === 'source_confirmed' && s.submission_kind === 'new'
            ? []
            : ['Needs individual source review']),
        ],
      })),
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
          const toPublish: EnrichedRow[] = [];
          const dupRows: EnrichedRow[] = [];
          for (const r of batch) {
            const { data, error } = await supabase.rpc('approve_submission', {
              _id: r.s.id,
              _source_url: r.s.source_url ?? '',
              _confirmed_source_date: true,
              _notes: `Bulk approved (batch ${batchIndex}/${totalBatches}); excerpt and date matched source`,
            });
            if (error) throw error;
            if ((data as { duplicate?: boolean } | null)?.duplicate) dupRows.push(r);
            else toPublish.push(r);
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
