import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RegionOverride {
  slug: string;
  intro: string | null;
  extra_cities: string[];
  extra_copy: string | null;
  updated_at: string;
}

export function useRegionOverride(slug: string | undefined) {
  return useQuery({
    queryKey: ["region-content-override", slug],
    enabled: !!slug,
    queryFn: async (): Promise<RegionOverride | null> => {
      const { data, error } = await supabase
        .from("region_content_overrides")
        .select("slug,intro,extra_cities,extra_copy,updated_at")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as RegionOverride) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
