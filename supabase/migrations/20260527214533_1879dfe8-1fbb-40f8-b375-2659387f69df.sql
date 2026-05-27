
-- Grounded extraction: store the verbatim source quote backing each candidate / event
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS source_quote text,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_notes text;

ALTER TABLE public.event_submissions
  ADD COLUMN IF NOT EXISTS source_quote text,
  ADD COLUMN IF NOT EXISTS venue_match_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS sanity_warnings text[] NOT NULL DEFAULT '{}'::text[];

-- Allowed verification states. Use trigger-style CHECK that is immutable.
DO $$ BEGIN
  ALTER TABLE public.events
    ADD CONSTRAINT events_verification_status_chk
    CHECK (verification_status IN ('verified','unverified','stale','missing'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.event_submissions
    ADD CONSTRAINT event_submissions_venue_match_status_chk
    CHECK (venue_match_status IN ('matched','fuzzy','unmatched','unknown'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_events_verification ON public.events(verification_status, event_date);
CREATE INDEX IF NOT EXISTS idx_events_last_verified ON public.events(last_verified_at);

-- Re-verification runs log
CREATE TABLE IF NOT EXISTS public.reverification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by text NOT NULL DEFAULT 'cron',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running',
  events_checked integer NOT NULL DEFAULT 0,
  events_verified integer NOT NULL DEFAULT 0,
  events_flagged integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT SELECT ON public.reverification_runs TO authenticated;
GRANT ALL ON public.reverification_runs TO service_role;

ALTER TABLE public.reverification_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view reverification runs"
  ON public.reverification_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
