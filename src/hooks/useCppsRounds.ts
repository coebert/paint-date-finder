import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { groupCppsRounds, type CppsEvent, type CppsRound } from '@/lib/cpps';

const COLUMNS =
  'id,title,event_date,start_time,end_time,venue_name,venue_location,booking_url,price_info';

/** Fetch every CPPS event (any round, any season) and group them into rounds. */
export function useCppsRounds() {
  return useQuery({
    queryKey: ['cpps-rounds'],
    queryFn: async (): Promise<CppsRound[]> => {
      const { data, error } = await supabase
        .from('events')
        .select(COLUMNS)
        .ilike('title', 'CPPS%')
        .order('event_date', { ascending: true });
      if (error) throw error;
      return groupCppsRounds((data ?? []) as CppsEvent[]);
    },
  });
}
