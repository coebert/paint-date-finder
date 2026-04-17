UPDATE public.trusted_venue_sources
SET is_active = false,
    notes = 'Deactivated: only public events on Facebook, which Firecrawl does not support. Re-enable if dated events page appears on main site.',
    last_status = NULL,
    updated_at = now()
WHERE url LIKE '%facebook.com%';