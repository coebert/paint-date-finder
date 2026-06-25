
-- Revoke sensitive column reads for anon/authenticated
REVOKE SELECT (delete_token) ON public.event_flags FROM anon, authenticated;
REVOKE SELECT (delete_token, uploader_email) ON public.event_recaps FROM anon, authenticated;
REVOKE SELECT (delete_token) ON public.field_layouts FROM anon, authenticated;
REVOKE SELECT (delete_token, contact_email) ON public.player_seeking_posts FROM anon, authenticated;
REVOKE SELECT (contact_email, contact_phone) ON public.teams FROM anon, authenticated;

-- Enforce http(s) protocol on event_recaps.media_url to block javascript: XSS
ALTER TABLE public.event_recaps DROP CONSTRAINT IF EXISTS event_recaps_media_url_protocol_chk;
ALTER TABLE public.event_recaps
  ADD CONSTRAINT event_recaps_media_url_protocol_chk
  CHECK (media_url ~* '^https?://');
