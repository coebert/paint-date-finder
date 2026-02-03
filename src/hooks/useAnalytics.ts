import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VisitStats {
  visit_date: string;
  unique_visitors: number;
  total_visits: number;
}

export function useVisitStats(daysBack: number = 30) {
  return useQuery({
    queryKey: ['visit-stats', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_visit_stats', {
        days_back: daysBack,
      });

      if (error) throw error;
      return data as VisitStats[];
    },
  });
}

export function useVisitSummary() {
  return useQuery({
    queryKey: ['visit-summary'],
    queryFn: async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get today's stats
      const { data: todayData } = await supabase
        .from('user_visits')
        .select('id, user_id, session_id')
        .gte('visited_at', `${today}T00:00:00Z`);

      // Get this week's stats
      const { data: weekData } = await supabase
        .from('user_visits')
        .select('id, user_id, session_id')
        .gte('visited_at', `${weekAgo}T00:00:00Z`);

      // Get this month's stats
      const { data: monthData } = await supabase
        .from('user_visits')
        .select('id, user_id, session_id')
        .gte('visited_at', `${monthAgo}T00:00:00Z`);

      const countUnique = (data: any[] | null) => {
        if (!data) return 0;
        const unique = new Set(data.map(d => d.user_id || d.session_id));
        return unique.size;
      };

      return {
        today: {
          visits: todayData?.length || 0,
          uniqueVisitors: countUnique(todayData),
        },
        week: {
          visits: weekData?.length || 0,
          uniqueVisitors: countUnique(weekData),
        },
        month: {
          visits: monthData?.length || 0,
          uniqueVisitors: countUnique(monthData),
        },
      };
    },
  });
}
