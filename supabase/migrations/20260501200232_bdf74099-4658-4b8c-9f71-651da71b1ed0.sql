ALTER TABLE public.trusted_venue_sources
ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'venue';

ALTER TABLE public.trusted_venue_sources
DROP CONSTRAINT IF EXISTS trusted_venue_sources_source_type_check;

ALTER TABLE public.trusted_venue_sources
ADD CONSTRAINT trusted_venue_sources_source_type_check
CHECK (source_type IN ('venue', 'facebook_group'));