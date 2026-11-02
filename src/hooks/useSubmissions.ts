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
    if (error.code === '23505') return { id, alreadySaved: true };
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

export function useApproveSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submission, adminNotes }: { submission: EventSubmission; adminNotes?: string }) => {
      let mergedIntoEventId: string | null = null;

      // Prevent duplicate events if this submission was already approved
      if (submission.status !== 'approved') {
        // Try to find an existing canonical event (same venue, overlapping date, similar title)
        const { data: duplicateId } = await supabase.rpc('find_duplicate_event', {
          _venue: submission.venue_name,
          _date: submission.event_date,
          _title: submission.title,
        });

        if (duplicateId) {
          // Merge this submission's source info into the canonical event
          mergedIntoEventId = duplicateId as string;
          const { error: mergeError } = await supabase.rpc('merge_event_source', {
            _event_id: duplicateId,
            _source: {
              source_url: submission.source_url ?? null,
              source_quote: (submission as { source_quote?: string | null }).source_quote ?? null,
              description: submission.description ?? null,
              booking_url: submission.booking_url ?? null,
              price_info: submission.price_info ?? null,
              image_url: submission.image_url ?? null,
              venue_location: submission.venue_location ?? null,
              submitter: submission.submitter_name ?? null,
              merged_from_submission_id: submission.id,
            },
          });
          if (mergeError) throw mergeError;
        } else {
          // No duplicate — create a fresh event from the submission
          const { error: eventError } = await supabase
            .from('events')
            .insert({
              title: submission.title,
              description: submission.description,
              event_type: submission.event_type,
              venue_name: submission.venue_name,
              venue_location: submission.venue_location,
              event_date: submission.event_date,
              start_time: submission.start_time,
              end_time: submission.end_time,
              booking_url: submission.booking_url,
              price_info: submission.price_info,
              source_url: submission.source_url,
              image_url: submission.image_url,
              is_verified: true,
            });

          if (eventError) throw eventError;
        }
      }

      // Then update the submission status
      const notes = mergedIntoEventId
        ? `${adminNotes ? adminNotes + '\n' : ''}Merged into existing event ${mergedIntoEventId}`
        : adminNotes;
      const { error: updateError } = await supabase
        .from('event_submissions')
        .update({
          status: 'approved' as SubmissionStatus,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;
      return { mergedIntoEventId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (result?.mergedIntoEventId) {
        toast.success('Approved and merged into an existing duplicate event');
      } else {
        toast.success('Event approved and published!');
      }
    },
    onError: (error) => {
      toast.error('Failed to approve event: ' + error.message);
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
