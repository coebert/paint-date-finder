CREATE OR REPLACE FUNCTION public.merge_event_source(_event_id uuid, _source jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing jsonb;
  src_url text := _source->>'source_url';
BEGIN
  -- Only admins (browser callers) or server-side/service-role callers
  -- (auth.uid() IS NULL) may merge into public event listings.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT merged_sources INTO existing
  FROM public.events
  WHERE id = _event_id;

  IF existing IS NULL THEN
    existing := '[]'::jsonb;
  END IF;

  IF src_url IS NOT NULL AND src_url <> '' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(existing) e WHERE e->>'source_url' = src_url
  ) THEN
    RETURN;
  END IF;

  UPDATE public.events
  SET
    merged_sources = existing || jsonb_build_array(
      _source || jsonb_build_object('merged_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'))
    ),
    description  = COALESCE(NULLIF(description, ''),  _source->>'description'),
    booking_url  = COALESCE(booking_url,              _source->>'booking_url'),
    price_info   = COALESCE(price_info,               _source->>'price_info'),
    image_url    = COALESCE(image_url,                _source->>'image_url'),
    venue_location = COALESCE(venue_location,         _source->>'venue_location'),
    source_url   = COALESCE(source_url,               _source->>'source_url'),
    source_quote = COALESCE(source_quote,             _source->>'source_quote'),
    updated_at   = now()
  WHERE id = _event_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.merge_event_source(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_event_source(uuid, jsonb) TO authenticated, service_role;