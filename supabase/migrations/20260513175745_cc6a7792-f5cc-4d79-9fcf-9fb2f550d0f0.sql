CREATE TABLE public.freshness_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  last_successful_scrape_at timestamptz,
  last_event_update_at timestamptz,
  stale_event_count integer NOT NULL DEFAULT 0,
  scrape_stale boolean NOT NULL DEFAULT false,
  updates_stale boolean NOT NULL DEFAULT false,
  alert_sent boolean NOT NULL DEFAULT false,
  details jsonb
);

CREATE INDEX idx_freshness_snapshots_captured_at ON public.freshness_snapshots (captured_at DESC);

ALTER TABLE public.freshness_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view freshness snapshots"
  ON public.freshness_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));