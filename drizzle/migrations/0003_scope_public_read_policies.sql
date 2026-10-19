DROP POLICY IF EXISTS "Round results are viewable by everyone" ON public.cpps_round_results;
CREATE POLICY "Published round results are viewable by everyone" ON public.cpps_round_results
  FOR SELECT TO anon, authenticated
  USING (season <= to_char(now(), 'YYYY'));

DROP POLICY IF EXISTS "Region overrides are publicly readable" ON public.region_content_overrides;
CREATE POLICY "Region overrides with content are publicly readable" ON public.region_content_overrides
  FOR SELECT TO anon, authenticated
  USING (intro IS NOT NULL OR extra_copy IS NOT NULL OR cardinality(extra_cities) > 0);

DROP POLICY IF EXISTS "Layouts are publicly viewable" ON public.field_layouts;
CREATE POLICY "Non-empty layouts are publicly viewable" ON public.field_layouts
  FOR SELECT TO anon, authenticated
  USING (obstacle_count > 0);

REVOKE SELECT ON public.field_layouts FROM anon, authenticated;
GRANT SELECT (id, name, description, author_name, tags, obstacles, obstacle_count, created_at, updated_at) ON public.field_layouts TO anon, authenticated;

DROP POLICY IF EXISTS "Venues are publicly viewable" ON public.venues;
CREATE POLICY "Listed venues are publicly viewable" ON public.venues
  FOR SELECT TO anon, authenticated
  USING (slug IS NOT NULL);