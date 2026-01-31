import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaintballEvent, EventType } from '@/types/events';
import { toast } from 'sonner';

export function useEvents(filters?: {
  eventType?: EventType;
  venue?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters?.venue) {
        query = query.ilike('venue_name', `%${filters.venue}%`);
      }

      if (filters?.startDate) {
        query = query.gte('event_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('event_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PaintballEvent[];
    },
  });
}

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('venue_name')
        .order('venue_name');

      if (error) throw error;
      
      // Get unique venues
      const uniqueVenues = [...new Set(data.map(e => e.venue_name))];
      return uniqueVenues;
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PaintballEvent> }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update event: ' + error.message);
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<PaintballEvent, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create event: ' + error.message);
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete event: ' + error.message);
    },
  });
}
