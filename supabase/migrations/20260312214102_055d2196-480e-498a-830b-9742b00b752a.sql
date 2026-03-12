
-- Allow anyone to see if an event has unresolved flags (needed for warning display)
CREATE POLICY "Anyone can view unresolved flag counts"
  ON public.event_flags
  FOR SELECT
  TO anon, authenticated
  USING (is_resolved = false);
