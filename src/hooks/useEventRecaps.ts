import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EventRecap {
  id: string;
  event_id: string;
  uploader_name: string;
  uploader_email: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
}

export interface NewEventRecap {
  event_id: string;
  uploader_name: string;
  uploader_email: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption?: string;
}

export function useApprovedRecaps(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-recaps', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_recaps')
        .select('id, event_id, uploader_name, media_url, media_type, caption, status, created_at, reviewed_at')
        .eq('event_id', eventId!)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EventRecap[];
    },
  });
}

export function useAdminRecaps() {
  return useQuery({
    queryKey: ['admin-event-recaps'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_event_recaps');
      if (error) throw error;
      return (data ?? []) as EventRecap[];
    },
  });
}

export function useCreateRecap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewEventRecap) => {
      const { error } = await supabase.from('event_recaps').insert({
        event_id: input.event_id,
        uploader_name: input.uploader_name.trim(),
        uploader_email: input.uploader_email.trim().toLowerCase(),
        media_url: input.media_url.trim(),
        media_type: input.media_type,
        caption: input.caption?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Thanks! Your recap is pending moderator review.');
      qc.invalidateQueries({ queryKey: ['admin-event-recaps'] });
    },
    onError: (err: Error) => toast.error(`Failed to submit: ${err.message}`),
  });
}

export function useUpdateRecapStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EventRecap['status'] }) => {
      const { error } = await supabase
        .from('event_recaps')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-event-recaps'] });
      qc.invalidateQueries({ queryKey: ['event-recaps'] });
      toast.success('Recap updated.');
    },
  });
}

export function useDeleteRecap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('event_recaps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-event-recaps'] });
      qc.invalidateQueries({ queryKey: ['event-recaps'] });
      toast.success('Recap deleted.');
    },
  });
}
