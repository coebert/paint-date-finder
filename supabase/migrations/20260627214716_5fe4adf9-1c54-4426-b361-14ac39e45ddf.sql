
CREATE TABLE public.region_content_overrides (
  slug text PRIMARY KEY,
  intro text,
  extra_cities text[] NOT NULL DEFAULT '{}',
  extra_copy text,
  generated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.region_content_overrides TO anon, authenticated;
GRANT ALL ON public.region_content_overrides TO service_role;

ALTER TABLE public.region_content_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Region overrides are publicly readable"
  ON public.region_content_overrides
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage region overrides"
  ON public.region_content_overrides
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_region_content_overrides_updated_at
  BEFORE UPDATE ON public.region_content_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
