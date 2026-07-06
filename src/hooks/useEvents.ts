import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaintballEvent, PaintballEventInsert, PaintballEventUpdate, EventType } from '@/types/events';
import { normalizeEventUrls } from '@/lib/validation';
import { toast } from 'sonner';

export type EventFilters = {
  eventType?: EventType;
  venue?: string;
  startDate?: string;
  endDate?: string;
  verifiedOnly?: boolean;
  beginnerOnly?: boolean;
  regionVenues?: string[];
};

/**
 * Central query-key factory. Keeps every cache read/write/invalidation in
 * sync so hook consumers can't accidentally miss a shape (e.g. invalidating
 * `['events']` but writing under `['events', 'list']`).
 */
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: EventFilters) => [...eventKeys.lists(), filters ?? {}] as const,
  detail: (id: string | undefined) => [...eventKeys.all, 'byId', id] as const,
  venues: () => ['events', 'venues'] as const,
};

/** Invalidate every list cache without touching detail caches unnecessarily. */
function invalidateAllEventCaches(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: eventKeys.lists() });
  qc.invalidateQueries({ queryKey: eventKeys.venues() });
  if (id) qc.invalidateQueries({ queryKey: eventKeys.detail(id) });
}

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters),
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

      if (filters?.verifiedOnly) {
        query = query.eq('is_verified', true);
      }

      if (filters?.beginnerOnly) {
        query = query.eq('is_beginner_friendly', true);
      }

      if (filters?.regionVenues && filters.regionVenues.length > 0) {
        query = query.in('venue_name', filters.regionVenues);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as PaintballEvent[]).map(normalizeEventUrls);
    },
  });
}

export function useEventById(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeEventUrls(data as PaintballEvent) : null;
    },
  });
}

/**
 * Distinct list of venue names for filter dropdowns.
 *
 * Sourced from the canonical `venues` table rather than scanning every
 * event row — this used to fetch N events just to `[...new Set()]` them,
 * which scaled linearly with event count.
 */
export function useVenues() {
  return useQuery({
    queryKey: eventKeys.venues(),
    // Venues change rarely — keep the list warm for 5 minutes.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('name')
        .order('name');

      if (error) throw error;
      // Defensive dedupe in case duplicate names slip through.
      return Array.from(new Set((data ?? []).map((v) => v.name).filter(Boolean)));
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PaintballEventUpdate }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      invalidateAllEventCaches(queryClient, variables.id);
      // Prime the detail cache so the event page reflects the edit instantly.
      if (data) {
        queryClient.setQueryData(
          eventKeys.detail(variables.id),
          normalizeEventUrls(data as PaintballEvent),
        );
      }
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
    mutationFn: async (event: PaintballEventInsert) => {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidateAllEventCaches(queryClient, data?.id);
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
      return id;
    },
    onSuccess: (id) => {
      invalidateAllEventCaches(queryClient, id);
      queryClient.removeQueries({ queryKey: eventKeys.detail(id) });
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete event: ' + error.message);
    },
  });
}
