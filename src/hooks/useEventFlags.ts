import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
