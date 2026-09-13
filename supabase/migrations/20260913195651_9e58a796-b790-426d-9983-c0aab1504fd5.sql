CREATE TABLE public.flyer_extraction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flyer_extraction_log_user_time
  ON public.flyer_extraction_log (user_id, created_at DESC);

GRANT ALL ON public.flyer_extraction_log TO service_role;

ALTER TABLE public.flyer_extraction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view flyer extraction log"
ON public.flyer_extraction_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));