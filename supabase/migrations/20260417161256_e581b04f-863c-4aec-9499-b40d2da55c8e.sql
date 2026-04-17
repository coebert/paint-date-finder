UPDATE public.trusted_venue_sources
SET url = 'https://www.facebook.com/BristolActivity/events',
    notes = 'FB events page — needs Firecrawl JS rendering',
    last_status = NULL,
    updated_at = now()
WHERE venue_name ILIKE '%bristol activity%';

UPDATE public.trusted_venue_sources
SET url = 'https://www.facebook.com/ancasterkartingandleisure/events',
    notes = 'FB events page — needs Firecrawl JS rendering',
    last_status = NULL,
    updated_at = now()
WHERE venue_name ILIKE '%ancaster%';

UPDATE public.trusted_venue_sources
SET venue_name = 'Skirmish Bristol Walk-On',
    url = 'https://www.facebook.com/BristolWalkOn/events',
    notes = 'FB events page — needs Firecrawl JS rendering. Was pointing at US Skirmish Pocono.',
    last_status = NULL,
    updated_at = now()
WHERE venue_name ILIKE '%skirmish%';