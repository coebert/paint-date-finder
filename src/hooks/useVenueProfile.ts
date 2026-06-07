import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeHttpUrl } from '@/lib/validation';
import { toast } from 'sonner';

export interface VenueProfile {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  region: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  field_map_url: string | null;
  hire_prices: Record<string, string | number> | null;
  walk_on_rules: string | null;
  gallery: string[];
  facilities: string[];
}

function normalize(v: Record<string, unknown>): VenueProfile {
  return {
    id: v.id as string,
    name: v.name as string,
    slug: (v.slug as string) ?? null,
    location: (v.location as string) ?? null,
    region: (v.region as string) ?? null,
    website: normalizeHttpUrl(v.website as string | null),
    latitude: (v.latitude as number) ?? null,
    longitude: (v.longitude as number) ?? null,
    field_map_url: normalizeHttpUrl(v.field_map_url as string | null),
    hire_prices: (v.hire_prices as Record<string, string | number>) ?? {},
    walk_on_rules: (v.walk_on_rules as string) ?? null,
    gallery: Array.isArray(v.gallery) ? (v.gallery as string[]) : [],
    facilities: Array.isArray(v.facilities) ? (v.facilities as string[]) : [],
  };
}

export function useVenueProfileBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['venue-profile', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();
      if (error) throw error;
      return data ? normalize(data) : null;
    },
  });
}

export function useAdminVenues() {
  return useQuery({
    queryKey: ['admin-venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(normalize);
    },
  });
}

export function useUpdateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VenueProfile> }) => {
      const { error } = await supabase
        .from('venues')
        .update({
          ...(updates.website !== undefined ? { website: updates.website } : {}),
          ...(updates.location !== undefined ? { location: updates.location } : {}),
          ...(updates.region !== undefined ? { region: updates.region } : {}),
          ...(updates.latitude !== undefined ? { latitude: updates.latitude } : {}),
          ...(updates.longitude !== undefined ? { longitude: updates.longitude } : {}),
          ...(updates.field_map_url !== undefined ? { field_map_url: updates.field_map_url } : {}),
          ...(updates.hire_prices !== undefined ? { hire_prices: updates.hire_prices } : {}),
          ...(updates.walk_on_rules !== undefined ? { walk_on_rules: updates.walk_on_rules } : {}),
          ...(updates.gallery !== undefined ? { gallery: updates.gallery } : {}),
          ...(updates.facilities !== undefined ? { facilities: updates.facilities } : {}),
          ...(updates.slug !== undefined ? { slug: updates.slug } : {}),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-venues'] });
      qc.invalidateQueries({ queryKey: ['venue-profile'] });
      qc.invalidateQueries({ queryKey: ['venue-details'] });
      toast.success('Venue updated.');
    },
    onError: (err: Error) => toast.error(`Failed to update: ${err.message}`),
  });
}

export function venueSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
