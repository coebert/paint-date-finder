import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrustedSource {
  id: string;
  venue_name: string;
  url: string;
  notes: string | null;
  is_active: boolean;
  last_scraped_at: string | null;
  last_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeRun {
  id: string;
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  sources_processed: number;
  candidates_created: number;
  errors: unknown;
  status: string;
}

export function useTrustedSources() {
  return useQuery({
    queryKey: ['trusted_venue_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusted_venue_sources')
        .select('*')
        .order('venue_name');
      if (error) throw error;
      return data as TrustedSource[];
    },
  });
}

export function useScrapeRuns() {
  return useQuery({
    queryKey: ['scrape_runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scrape_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ScrapeRun[];
    },
  });
}

export function useUpsertTrustedSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<TrustedSource> & { venue_name: string; url: string },
    ) => {
      if (input.id) {
        const { error } = await supabase
          .from('trusted_venue_sources')
          .update({
            venue_name: input.venue_name,
            url: input.url,
            notes: input.notes ?? null,
            is_active: input.is_active ?? true,
          })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trusted_venue_sources')
          .insert({
            venue_name: input.venue_name,
            url: input.url,
            notes: input.notes ?? null,
            is_active: input.is_active ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trusted_venue_sources'] });
      toast.success('Source saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTrustedSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trusted_venue_sources')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trusted_venue_sources'] });
      toast.success('Source removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRunScrape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'scrape-venue-events',
        { body: { triggeredBy: 'manual' } },
      );
      if (error) throw error;
      return data as {
        sources_processed: number;
        candidates_created: number;
        status: string;
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scrape_runs'] });
      qc.invalidateQueries({ queryKey: ['trusted_venue_sources'] });
      qc.invalidateQueries({ queryKey: ['submissions'] });
      toast.success(
        `Scrape ${data.status} — ${data.candidates_created} candidate(s) from ${data.sources_processed} source(s)`,
      );
    },
    onError: (e: Error) => toast.error(`Scrape failed: ${e.message}`),
  });
}
