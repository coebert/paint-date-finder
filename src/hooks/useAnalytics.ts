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

export function useEventTypeStats() {
  return useQuery({
    queryKey: ['event-type-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('event_type');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(event => {
        counts[event.event_type] = (counts[event.event_type] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
    },
  });
}

export function useVenueStats() {
  return useQuery({
    queryKey: ['venue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('venue_name');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(event => {
        counts[event.venue_name] = (counts[event.venue_name] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([venue, count]) => ({ venue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 venues
    },
  });
}

export function usePeakHoursStats() {
  return useQuery({
    queryKey: ['peak-hours-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_visits')
        .select('visited_at');

      if (error) throw error;

      const hourCounts: number[] = Array(24).fill(0);
      data?.forEach(visit => {
        const hour = new Date(visit.visited_at).getHours();
        hourCounts[hour]++;
      });

      return hourCounts.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        visits: count,
      }));
    },
  });
}
