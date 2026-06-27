
CREATE TABLE public.region_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  fail_count int NOT NULL DEFAULT 0,
  warn_count int NOT NULL DEFAULT 0,
  ok_count int NOT NULL DEFAULT 0,
  fingerprint text NOT NULL,
  rows jsonb NOT NULL,
  triggered_by text NOT NULL DEFAULT 'cron'
);

CREATE INDEX region_audit_runs_created_at_idx ON public.region_audit_runs (created_at DESC);

GRANT SELECT ON public.region_audit_runs TO authenticated;
GRANT ALL ON public.region_audit_runs TO service_role;

ALTER TABLE public.region_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read region audit runs"
ON public.region_audit_runs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
