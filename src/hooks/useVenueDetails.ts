import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeVenueUrls } from '@/lib/validation';

export interface VenueDetails {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export function useVenueDetails() {
  return useQuery({
    queryKey: ['venue-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Create a map for quick lookups
      const venueMap = new Map<string, VenueDetails>();
      data.forEach((venue) => {
        venueMap.set(venue.name, normalizeVenueUrls(venue as VenueDetails));
      });

      return venueMap;
    },
  });
}
