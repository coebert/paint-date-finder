import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventSubmission, EventSubmissionInsert, SubmissionStatus } from '@/types/submissions';
import { normalizeEventUrls } from '@/lib/validation';
import { toast } from 'sonner';

export function useSubmissions(status?: SubmissionStatus) {
  return useQuery({
    queryKey: ['submissions', status],
    queryFn: async () => {
      let query = supabase
        .from('event_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as EventSubmission[]).map(normalizeEventUrls);
    },
  });
}

export interface CreateSubmissionInput {
  /** Client-generated id; reusing it on retry makes the insert idempotent. */
  id: string;
  submission: EventSubmissionInsert;
}

/**
 * Public submissions: anyone may INSERT but only admins may SELECT, so we
 * must not ask for the row back (that would fail RLS and look like an error
 * even though the row was saved). The id is generated client-side so a retry
 * after a dropped response hits the primary key instead of duplicating.
 */
export async function insertSubmission({ id, submission }: CreateSubmissionInput): Promise<{ id: string; alreadySaved: boolean }> {
  const { error } = await supabase
    .from('event_submissions')
    .insert({ ...submission, id, status: 'pending', admin_notes: null, reviewed_at: null });
  if (error) {
    // Only our own primary key means "this exact row was already saved";
    // any other unique violation is a real failure.
    if (error.code === '23505' && /event_submissions_pkey/.test(`${error.message ?? ''} ${(error as { details?: string }).details ?? ''}`)) {
      return { id, alreadySaved: true };
    }
    throw error;
  }
  return { id, alreadySaved: false };
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: insertSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

/** Turn a database/network error into something a visitor can act on. */
export function friendlySubmissionError(error: unknown): string {
  const e = error as { name?: string; message?: string; code?: string } | null;
  if (e?.name === 'SubmissionValidationError' && e.message) return e.message;
  const msg = e?.message ?? '';
  if (/failed to fetch|network|load failed/i.test(msg)) {
    return 'We could not reach the server. Check your connection and try again — your details are still filled in.';
  }
  if (e?.code === '23514' || /check constraint|row-level security/i.test(msg)) {
    return 'Some details were not accepted. Check the date, links and email, then try again.';
  }
  return 'Something went wrong sending your event. Please try again in a moment — your details are still filled in.';
}

export interface ApproveSubmissionInput {
  submission: EventSubmission;
  adminNotes?: string;
  /** Organiser/venue/event page the moderator checked (defaults to the submission's link). */
  sourceUrl?: string | null;
  /** Moderator confirms the source shows this exact day, month and year. */
  confirmedSourceDate: boolean;
}

/**
 * Approval runs entirely on the server (approve_submission): it requires a
 * source link and an explicit date check, keeps the excerpt and evidence,
 * matches only exact same-date duplicates, and records whether the listing is
 * organiser-source confirmed or moderator reviewed.
 */
export function useApproveSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submission, adminNotes, sourceUrl, confirmedSourceDate }: ApproveSubmissionInput) => {
      if (!confirmedSourceDate) {
        throw new Error('Confirm you checked the source shows this exact date');
      }
      const { data, error } = await supabase.rpc('approve_submission', {
        _id: submission.id,
        _source_url: sourceUrl?.trim() || submission.source_url || '',
        _confirmed_source_date: true,
        _notes: adminNotes || null,
      });
      if (error) throw error;
      const res = (data ?? {}) as { event_id?: string; duplicate?: boolean; basis?: string };
      return { mergedIntoEventId: res.duplicate ? res.event_id ?? null : null, basis: res.basis ?? null };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (result?.mergedIntoEventId) {
        toast.success('Matched an existing listing for the same day — source added to it');
      } else if (result?.basis === 'organiser_source') {
        toast.success('Published as organiser-source confirmed');
      } else {
        toast.success('Published as moderator reviewed');
      }
    },
    onError: (error) => {
      toast.error('Not approved: ' + error.message);
    },
  });
}


export function useRejectSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) => {
      const { error } = await supabase
        .from('event_submissions')
        .update({
          status: 'rejected' as SubmissionStatus,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submission rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject submission: ' + error.message);
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('event_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submission deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete submission: ' + error.message);
    },
  });
}
