import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('name, region')
        .not('region', 'is', null)
        .order('region');

      if (error) throw error;

      const regions = [...new Set(data.map(v => v.region as string))].sort();
      const venuesByRegion = new Map<string, string[]>();
      data.forEach(v => {
        const r = v.region as string;
        if (!venuesByRegion.has(r)) venuesByRegion.set(r, []);
        venuesByRegion.get(r)!.push(v.name);
      });

      return { regions, venuesByRegion };
    },
  });
}
