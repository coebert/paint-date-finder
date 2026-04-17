ALTER TABLE public.trusted_venue_sources
  ADD COLUMN IF NOT EXISTS last_returned integer,
  ADD COLUMN IF NOT EXISTS last_inserted integer,
  ADD COLUMN IF NOT EXISTS last_deduped integer,
  ADD COLUMN IF NOT EXISTS last_invalid_date integer,
  ADD COLUMN IF NOT EXISTS last_error_message text,
  ADD COLUMN IF NOT EXISTS last_used_firecrawl boolean,
  ADD COLUMN IF NOT EXISTS last_chars integer;