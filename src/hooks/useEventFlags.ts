import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'user-event-flags';

/** Get stored flag tokens from localStorage */
function getStoredFlags(): Record<string, { flagId: string; deleteToken: string }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Store a flag token in localStorage */
export function storeFlagToken(eventId: string, flagId: string, deleteToken: string) {
  const flags = getStoredFlags();
  flags[eventId] = { flagId, deleteToken };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
}

/** Remove a stored flag token */
function removeFlagToken(eventId: string) {
  const flags = getStoredFlags();
  delete flags[eventId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
}

/** Get the stored flag for a specific event */
export function getStoredFlagForEvent(eventId: string) {
  return getStoredFlags()[eventId] ?? null;
}

export function useFlaggedEventIds() {
  return useQuery({
    queryKey: ['flagged-event-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_flags' as any)
        .select('event_id')
        .eq('is_resolved', false);

      if (error) throw error;

      const flaggedIds = new Set<string>();
      for (const row of data ?? []) {
        flaggedIds.add((row as any).event_id);
      }
      return flaggedIds;
    },
    staleTime: 60_000,
  });
}

/** Withdraw a flag using the delete token (for anonymous users) */
export function useWithdrawFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, flagId, deleteToken }: { eventId: string; flagId: string; deleteToken: string }) => {
      const { data, error } = await supabase.rpc('delete_event_flag', {
        _id: flagId,
        _token: deleteToken,
      });

      if (error) throw error;
      if (!data) throw new Error('Flag not found or token invalid');

      removeFlagToken(eventId);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-event-ids'] });
      queryClient.invalidateQueries({ queryKey: ['admin-event-flags'] });
      toast.success('Your report has been withdrawn.');
    },
    onError: () => {
      toast.error('Failed to withdraw report. It may have already been resolved.');
    },
  });
}

/** Admin: fetch all flags with event details */
export function useAdminEventFlags() {
  return useQuery({
    queryKey: ['admin-event-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_flags' as any)
        .select('*, events(title, venue_name, event_date)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });
}

/** Admin: resolve/dismiss a flag */
export function useResolveFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flagId: string) => {
      const { error } = await supabase
        .from('event_flags' as any)
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', flagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-event-flags'] });
      queryClient.invalidateQueries({ queryKey: ['flagged-event-ids'] });
      toast.success('Flag resolved.');
    },
    onError: () => {
      toast.error('Failed to resolve flag.');
    },
  });
}

/** Admin: apply a flag's suggested date to its event, mark unverified for revalidation, then resolve the flag */
export function useApplySuggestedDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flagId,
      eventId,
      suggestedDate,
    }: {
      flagId: string;
      eventId: string;
      suggestedDate: string;
    }) => {
      const { error: updateErr } = await supabase
        .from('events')
        .update({ event_date: suggestedDate, is_verified: false })
        .eq('id', eventId);
      if (updateErr) throw updateErr;

      const { error: resolveErr } = await supabase
        .from('event_flags' as any)
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', flagId);
      if (resolveErr) throw resolveErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-event-flags'] });
      queryClient.invalidateQueries({ queryKey: ['flagged-event-ids'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Date corrected. Event marked unverified pending revalidation.');
    },
    onError: (err: any) => {
      toast.error('Failed to apply correction: ' + (err?.message ?? 'unknown error'));
    },
  });
}

/** Admin: delete a flag permanently */
export function useDeleteFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flagId: string) => {
      const { error } = await supabase
        .from('event_flags' as any)
        .delete()
        .eq('id', flagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-event-flags'] });
      queryClient.invalidateQueries({ queryKey: ['flagged-event-ids'] });
      toast.success('Flag deleted.');
    },
    onError: () => {
      toast.error('Failed to delete flag.');
    },
  });
}
