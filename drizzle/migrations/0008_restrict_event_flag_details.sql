-- Public callers only need to know which events have open reports.
REVOKE SELECT ON public.event_flags FROM anon, authenticated, PUBLIC;
REVOKE SELECT (details, suggested_date, reason, created_at, resolved_at, delete_token)
  ON public.event_flags FROM anon, authenticated, PUBLIC;
-- id is kept so moderators' UPDATE/DELETE ... WHERE id = ... still work (RLS limits those to admins).
GRANT SELECT (id, event_id, is_resolved) ON public.event_flags TO anon, authenticated;
GRANT ALL ON public.event_flags TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_event_flags()
RETURNS TABLE (
  id uuid,
  event_id uuid,
  reason public.event_flag_reason,
  details text,
  suggested_date date,
  created_at timestamptz,
  resolved_at timestamptz,
  is_resolved boolean,
  event_title text,
  event_venue_name text,
  event_date date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT f.id, f.event_id, f.reason, f.details, f.suggested_date, f.created_at,
           f.resolved_at, f.is_resolved, e.title, e.venue_name, e.event_date
    FROM public.event_flags f
    LEFT JOIN public.events e ON e.id = f.event_id
    ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_event_flags() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_event_flags() TO authenticated, service_role;