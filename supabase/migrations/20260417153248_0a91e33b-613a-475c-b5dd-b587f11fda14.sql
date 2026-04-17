
-- Enable pg_cron and pg_net for scheduled scraping
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trusted venue sources (admin-curated URLs to scrape)
CREATE TABLE IF NOT EXISTS public.trusted_venue_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name text NOT NULL,
  url text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  last_scraped_at timestamptz,
  last_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (url)
);

ALTER TABLE public.trusted_venue_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage trusted sources"
  ON public.trusted_venue_sources
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_trusted_venue_sources_updated
  BEFORE UPDATE ON public.trusted_venue_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scrape runs (history of scraper executions)
CREATE TABLE IF NOT EXISTS public.scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by text NOT NULL DEFAULT 'cron', -- 'cron' or 'manual'
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  sources_processed int NOT NULL DEFAULT 0,
  candidates_created int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'running' -- running | success | partial | failed
);

ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view scrape runs"
  ON public.scrape_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_scrape_runs_started_at ON public.scrape_runs (started_at DESC);
