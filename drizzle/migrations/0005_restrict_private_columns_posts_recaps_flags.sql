REVOKE SELECT ON public.player_seeking_posts FROM anon, authenticated, PUBLIC;
GRANT SELECT (id, player_name, target_date, region, event_type, notes, expires_at, is_hidden, created_at) ON public.player_seeking_posts TO anon, authenticated;

REVOKE SELECT ON public.event_recaps FROM anon, authenticated, PUBLIC;
GRANT SELECT (id, event_id, uploader_name, media_url, media_type, caption, status, created_at, reviewed_at) ON public.event_recaps TO anon, authenticated;

REVOKE SELECT ON public.event_flags FROM anon, authenticated, PUBLIC;
GRANT SELECT (id, event_id, reason, details, created_at, resolved_at, is_resolved, suggested_date) ON public.event_flags TO anon, authenticated;