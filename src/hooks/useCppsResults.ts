import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CppsRoundResult } from '@/lib/cpps';

export const CPPS_CURRENT_SEASON = '2026';

export const cppsResultKeys = {
  all: ['cpps-results'] as const,
  season: (season: string) => ['cpps-results', season] as const,
};

/** Fetch every recorded CPPS round result for a season. */
export function useCppsResults(season: string = CPPS_CURRENT_SEASON) {
  return useQuery({
    queryKey: cppsResultKeys.season(season),
    queryFn: async (): Promise<CppsRoundResult[]> => {
      const { data, error } = await supabase
        .from('cpps_round_results')
        .select('id,season,round,division,team_id,team_name,position,points,notes')
        .eq('season', season)
        .order('round', { ascending: true })
        .order('position', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as CppsRoundResult[];
    },
  });
}
