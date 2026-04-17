UPDATE public.trusted_venue_sources
SET url = 'https://halomill.co.uk/store',
    notes = 'Booking/store page lists events',
    last_status = NULL,
    updated_at = now()
WHERE venue_name ILIKE '%halo mill%';

UPDATE public.trusted_venue_sources
SET is_active = false,
    notes = 'No public events listing — enquiry-only site. Deactivated.',
    last_status = NULL,
    updated_at = now()
WHERE venue_name ILIKE '%bassetts%' OR venue_name ILIKE '%NPF%';