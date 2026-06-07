
-- 1. Revoke sensitive column SELECT from anon/authenticated
REVOKE SELECT (delete_token) ON public.event_flags FROM anon, authenticated;
REVOKE SELECT (delete_token, uploader_email) ON public.event_recaps FROM anon, authenticated;
REVOKE SELECT (delete_token, contact_email) ON public.player_seeking_posts FROM anon, authenticated;

-- 2. Admin SECURITY DEFINER helpers to read full rows
CREATE OR REPLACE FUNCTION public.get_admin_event_recaps()
RETURNS SETOF public.event_recaps
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.event_recaps ORDER BY created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_admin_player_seeking_posts()
RETURNS SETOF public.player_seeking_posts
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.player_seeking_posts ORDER BY created_at DESC;
END; $$;

-- 3. Submitter create RPC returning private delete_token
CREATE OR REPLACE FUNCTION public.create_player_seeking_post(
  _player_name text,
  _contact_email text,
  _target_date date,
  _expires_at date,
  _region text DEFAULT NULL,
  _event_type event_type DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS TABLE(id uuid, delete_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
  new_token uuid;
BEGIN
  IF _player_name IS NULL OR length(trim(_player_name)) = 0 OR length(_player_name) > 80 THEN
    RAISE EXCEPTION 'Invalid player_name';
  END IF;
  IF _contact_email IS NULL OR length(trim(_contact_email)) < 3 OR length(_contact_email) > 200 THEN
    RAISE EXCEPTION 'Invalid contact_email';
  END IF;
  IF _notes IS NOT NULL AND length(_notes) > 500 THEN
    RAISE EXCEPTION 'Notes too long';
  END IF;
  IF _region IS NOT NULL AND length(_region) > 80 THEN
    RAISE EXCEPTION 'Region too long';
  END IF;
  IF _target_date < CURRENT_DATE OR _target_date > (CURRENT_DATE + INTERVAL '180 days')::date THEN
    RAISE EXCEPTION 'Invalid target_date';
  END IF;
  IF _expires_at < CURRENT_DATE OR _expires_at > (CURRENT_DATE + INTERVAL '180 days')::date THEN
    RAISE EXCEPTION 'Invalid expires_at';
  END IF;

  INSERT INTO public.player_seeking_posts (player_name, contact_email, target_date, expires_at, region, event_type, notes)
  VALUES (trim(_player_name), lower(trim(_contact_email)), _target_date, _expires_at,
          NULLIF(trim(_region), ''), _event_type, NULLIF(trim(_notes), ''))
  RETURNING public.player_seeking_posts.id, public.player_seeking_posts.delete_token
  INTO new_id, new_token;

  id := new_id;
  delete_token := new_token;
  RETURN NEXT;
END; $$;

-- 4. Storage: remove anon flyer upload + broad listing policies
DROP POLICY IF EXISTS "Anyone can upload flyer images" ON storage.objects;
DROP POLICY IF EXISTS "Flyer images are publicly readable" ON storage.objects;
