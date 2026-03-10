import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/hooks/useTeams';

export interface RosterPlayer {
  id: string;
  team_id: string;
  player_name: string;
  player_number: string | null;
  role: string | null;
  is_captain: boolean;
  created_at: string;
}

export function useTeamById(id: string | undefined) {
  return useQuery({
    queryKey: ['team', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Team;
    },
  });
}

export function useTeamRoster(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-roster', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_roster')
        .select('*')
        .eq('team_id', teamId!)
        .order('is_captain', { ascending: false })
        .order('player_number', { ascending: true });
      if (error) throw error;
      return data as RosterPlayer[];
    },
  });
}
