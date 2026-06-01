import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StandingsHistoryPoint {
  id: string;
  team_id: string;
  division: string;
  position: number | null;
  points: number;
  captured_at: string;
  season: string;
}

export function useTeamStandingsHistory(teamId: string | undefined) {
  return useQuery({
    queryKey: ['standings-history', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<StandingsHistoryPoint[]> => {
      const { data, error } = await supabase
        .from('team_standings_history')
        .select('id, team_id, division, position, points, captured_at, season')
        .eq('team_id', teamId!)
        .order('captured_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StandingsHistoryPoint[];
    },
  });
}
