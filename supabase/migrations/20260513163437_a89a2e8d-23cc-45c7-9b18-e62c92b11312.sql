-- 1. Lock down delete_token columns (revoke column-level SELECT)
REVOKE SELECT (delete_token) ON public.field_layouts FROM anon, authenticated;
REVOKE SELECT (delete_token) ON public.event_flags FROM anon, authenticated;

-- 2. Lock down team contact columns (revoke column-level SELECT from public roles)
REVOKE SELECT (contact_email, contact_phone) ON public.teams FROM anon, authenticated;

-- 3. Insert RPCs that return delete_token at creation time
CREATE OR REPLACE FUNCTION public.create_field_layout(
  _name text,
  _description text,
  _author_name text,
  _tags text[],
  _obstacles jsonb,
  _obstacle_count int
) RETURNS TABLE(id uuid, delete_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_token uuid;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 OR length(_name) > 200 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF _description IS NOT NULL AND length(_description) > 2000 THEN
    RAISE EXCEPTION 'Description too long';
  END IF;
  IF _author_name IS NOT NULL AND length(_author_name) > 100 THEN
    RAISE EXCEPTION 'Author name too long';
  END IF;
  IF _obstacle_count < 0 OR _obstacle_count > 500 THEN
    RAISE EXCEPTION 'Invalid obstacle_count';
  END IF;

  INSERT INTO public.field_layouts (name, description, author_name, tags, obstacles, obstacle_count)
  VALUES (_name, NULLIF(trim(_description), ''), NULLIF(trim(_author_name), ''), COALESCE(_tags, '{}'::text[]), _obstacles, _obstacle_count)
  RETURNING public.field_layouts.id, public.field_layouts.delete_token INTO new_id, new_token;

  id := new_id;
  delete_token := new_token;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_field_layout(text, text, text, text[], jsonb, int) FROM public;
GRANT EXECUTE ON FUNCTION public.create_field_layout(text, text, text, text[], jsonb, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_event_flag(
  _event_id uuid,
  _reason event_flag_reason,
  _details text
) RETURNS TABLE(id uuid, delete_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_token uuid;
BEGIN
  IF _details IS NOT NULL AND length(_details) > 500 THEN
    RAISE EXCEPTION 'Details too long';
  END IF;

  INSERT INTO public.event_flags (event_id, reason, details)
  VALUES (_event_id, _reason, NULLIF(trim(_details), ''))
  RETURNING public.event_flags.id, public.event_flags.delete_token INTO new_id, new_token;

  id := new_id;
  delete_token := new_token;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_event_flag(uuid, event_flag_reason, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_event_flag(uuid, event_flag_reason, text) TO anon, authenticated;

-- 4. Admin-only function to fetch team contact info
CREATE OR REPLACE FUNCTION public.get_admin_team_contacts()
RETURNS TABLE(id uuid, contact_email text, contact_phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT t.id, t.contact_email, t.contact_phone
    FROM public.teams t;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_team_contacts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_team_contacts() TO authenticated;

-- 5. Visit stats: switch to SECURITY INVOKER so user_visits admin-only RLS applies
CREATE OR REPLACE FUNCTION public.get_visit_stats(days_back integer DEFAULT 30)
 RETURNS TABLE(visit_date date, unique_visitors bigint, total_visits bigint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT
    DATE(visited_at) as visit_date,
    COUNT(DISTINCT COALESCE(user_id::text, session_id)) as unique_visitors,
    COUNT(*) as total_visits
  FROM public.user_visits
  WHERE visited_at >= NOW() - (days_back || ' days')::interval
  GROUP BY DATE(visited_at)
  ORDER BY visit_date ASC
$function$;

REVOKE EXECUTE ON FUNCTION public.get_visit_stats(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_visit_stats(integer) TO authenticated;

-- 6. Restrict flyer-image uploads to admins (matches existing admin-only update/delete)
DROP POLICY IF EXISTS "Anyone can upload flyer images" ON storage.objects;
CREATE POLICY "Admins can upload flyer images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'flyer-images'
  AND has_role(auth.uid(), 'admin'::app_role)
);
