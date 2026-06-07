import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventSubmission, SubmissionStatus } from '@/types/submissions';
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

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submission: Omit<EventSubmission, 'id' | 'created_at' | 'reviewed_at' | 'status' | 'admin_notes'>) => {
      const { data, error } = await supabase
        .from('event_submissions')
        .insert(submission)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Event submitted for review!');
    },
    onError: (error) => {
      toast.error('Failed to submit event: ' + error.message);
    },
  });
}

export function useApproveSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submission, adminNotes }: { submission: EventSubmission; adminNotes?: string }) => {
      // Prevent duplicate events if this submission was already approved
      if (submission.status !== 'approved') {
        // First, create the event from the submission
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

      // Then update the submission status
      const { error: updateError } = await supabase
        .from('event_submissions')
        .update({
          status: 'approved' as SubmissionStatus,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event approved and published!');
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
