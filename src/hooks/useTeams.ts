import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Team {
  id: string;
  name: string;
  division: string;
  league: string;
  position: number | null;
  points: number;
  captain_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  social_media: Record<string, string>;
  logo_url: string | null;
  region: string | null;
  home_venue: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTeams(filters?: { division?: string; search?: string; league?: string; includeContact?: boolean }) {
  return useQuery({
    queryKey: ['teams', filters],
    queryFn: async () => {
      // Public-safe column list — contact_email/contact_phone are admin-only
      // and must be fetched via the get_admin_team_contacts RPC.
      const columns =
        'id,name,division,league,position,points,captain_name,website,logo_url,region,home_venue,description,is_active,created_at,updated_at,social_media';
      let query = supabase
        .from('teams')
        .select(columns)
        .eq('is_active', true)
        .order('division')
        .order('position', { ascending: true, nullsFirst: false });

      if (filters?.league) {
        query = query.eq('league', filters.league);
      }

      if (filters?.division) {
        query = query.eq('division', filters.division);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const teams = (data as unknown as Team[]).map((t) => ({
        ...t,
        contact_email: null,
        contact_phone: null,
      }));

      if (filters?.includeContact) {
        const { data: contacts, error: cErr } = await supabase.rpc('get_admin_team_contacts');
        if (!cErr && contacts) {
          const byId = new Map(
            (contacts as Array<{ id: string; contact_email: string | null; contact_phone: string | null }>).map(
              (c) => [c.id, c],
            ),
          );
          for (const t of teams) {
            const c = byId.get(t.id);
            if (c) {
              t.contact_email = c.contact_email;
              t.contact_phone = c.contact_phone;
            }
          }
        }
      }

      return teams;
    },
  });
}

export function useTeamDivisions() {
  return useQuery({
    queryKey: ['team-divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('division')
        .eq('is_active', true);

      if (error) throw error;

      const divisions = [...new Set(data.map((t: { division: string }) => t.division))];
      // Custom sort order
      const order = ['Elite', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Breakout'];
      return divisions.sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    },
  });
}
