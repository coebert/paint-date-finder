
CREATE OR REPLACE FUNCTION public.find_duplicate_event_excluding(
  _id uuid,
  _venue text,
  _date date,
  _title text,
  _date_window integer DEFAULT 2,
  _title_threshold double precision DEFAULT 0.4,
  _venue_threshold double precision DEFAULT 0.6
)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT id
  FROM public.events
  WHERE id <> _id
    AND event_date BETWEEN (_date - _date_window) AND (_date + _date_window)
    AND extensions.similarity(lower(venue_name), lower(coalesce(_venue, ''))) > _venue_threshold
    AND extensions.similarity(lower(title), lower(coalesce(_title, ''))) > _title_threshold
  ORDER BY
    -- prefer older events as canonical
    created_at ASC,
    abs(event_date - _date) ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_duplicate_event_excluding(uuid, text, date, text, integer, double precision, double precision) FROM public;
GRANT EXECUTE ON FUNCTION public.find_duplicate_event_excluding(uuid, text, date, text, integer, double precision, double precision) TO authenticated, service_role;
