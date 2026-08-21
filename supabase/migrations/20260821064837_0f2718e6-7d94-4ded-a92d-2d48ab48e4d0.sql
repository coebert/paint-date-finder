CREATE TABLE IF NOT EXISTS public.job_state (
  job_name text PRIMARY KEY,
  paused boolean NOT NULL DEFAULT false,
  paused_kind text,
  pause_reason text,
  paused_at timestamptz,
  lease_expires_at timestamptz,
  lease_owner uuid,
  last_run_at timestamptz,
  last_finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.job_state TO authenticated;
GRANT ALL ON public.job_state TO service_role;
ALTER TABLE public.job_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view job state" ON public.job_state;
CREATE POLICY "Admins can view job state" ON public.job_state
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_job_state_updated_at ON public.job_state;
CREATE TRIGGER trg_job_state_updated_at BEFORE UPDATE ON public.job_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Acquire a single-flight lease for a background job.
-- Returns: status = 'ok' | 'probe' | 'locked'
CREATE OR REPLACE FUNCTION public.job_begin(_job text, _ttl_seconds integer DEFAULT 900)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row public.job_state;
  new_owner uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.job_state (job_name) VALUES (_job)
  ON CONFLICT (job_name) DO NOTHING;

  SELECT * INTO row FROM public.job_state WHERE job_name = _job FOR UPDATE;

  -- Rate-limit pauses are transient: clear them on the next scheduled run.
  IF row.paused AND row.paused_kind = 'rate_limit' THEN
    UPDATE public.job_state
      SET paused = false, paused_kind = NULL, pause_reason = NULL, paused_at = NULL
      WHERE job_name = _job;
    row.paused := false;
  END IF;

  IF row.lease_expires_at IS NOT NULL AND row.lease_expires_at > now() THEN
    RETURN jsonb_build_object('status', 'locked', 'lease_expires_at', row.lease_expires_at);
  END IF;

  UPDATE public.job_state
    SET lease_owner = new_owner,
        lease_expires_at = now() + make_interval(secs => greatest(_ttl_seconds, 60)),
        last_run_at = now()
    WHERE job_name = _job;

  IF row.paused THEN
    -- Paused on credits/policy: allow a single probe item to detect recovery.
    RETURN jsonb_build_object('status', 'probe', 'owner', new_owner,
                              'pause_reason', row.pause_reason);
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'owner', new_owner);
END;
$$;

-- Release the lease at the end of a run.
CREATE OR REPLACE FUNCTION public.job_end(_job text, _owner uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.job_state
    SET lease_expires_at = NULL, lease_owner = NULL, last_finished_at = now()
    WHERE job_name = _job AND (lease_owner = _owner OR lease_owner IS NULL)
  RETURNING true;
$$;

-- Circuit breaker: park the job.
CREATE OR REPLACE FUNCTION public.job_pause(_job text, _kind text, _reason text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.job_state (job_name, paused, paused_kind, pause_reason, paused_at)
  VALUES (_job, true, _kind, left(coalesce(_reason, ''), 500), now())
  ON CONFLICT (job_name) DO UPDATE
    SET paused = true, paused_kind = _kind,
        pause_reason = left(coalesce(_reason, ''), 500), paused_at = now()
  RETURNING true;
$$;

-- Clear a pause. Callable by the service role (successful probe) or an admin.
CREATE OR REPLACE FUNCTION public.job_resume(_job text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.job_state
    SET paused = false, paused_kind = NULL, pause_reason = NULL, paused_at = NULL,
        lease_expires_at = NULL, lease_owner = NULL
    WHERE job_name = _job;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.job_begin(text, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.job_end(text, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.job_pause(text, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.job_resume(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.job_resume(text) TO authenticated;