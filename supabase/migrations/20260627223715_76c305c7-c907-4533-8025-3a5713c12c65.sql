
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS merged_sources jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_events_title_trgm
  ON public.events USING gin (title extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_venue_name_trgm
  ON public.events USING gin (venue_name extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.find_duplicate_event(
  _venue text,
  _date date,
  _title text,
  _date_window int DEFAULT 2,
  _title_threshold float DEFAULT 0.4,
  _venue_threshold float DEFAULT 0.6
) RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id
  FROM public.events
  WHERE event_date BETWEEN (_date - _date_window) AND (_date + _date_window)
    AND extensions.similarity(lower(venue_name), lower(coalesce(_venue, ''))) > _venue_threshold
    AND extensions.similarity(lower(title), lower(coalesce(_title, ''))) > _title_threshold
  ORDER BY
    abs(event_date - _date) ASC,
    extensions.similarity(lower(title), lower(coalesce(_title, ''))) DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.merge_event_source(
  _event_id uuid,
  _source jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing jsonb;
  src_url text := _source->>'source_url';
BEGIN
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
$$;

GRANT EXECUTE ON FUNCTION public.find_duplicate_event(text, date, text, int, float, float) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.merge_event_source(uuid, jsonb) TO authenticated, service_role;
