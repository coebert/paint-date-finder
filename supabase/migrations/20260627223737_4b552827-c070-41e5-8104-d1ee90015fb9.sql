
REVOKE EXECUTE ON FUNCTION public.find_duplicate_event(text, date, text, int, float, float) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.merge_event_source(uuid, jsonb) FROM PUBLIC, anon;
