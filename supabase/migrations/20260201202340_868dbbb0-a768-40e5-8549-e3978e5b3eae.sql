-- Fix the remaining overly permissive INSERT policy on event_submissions
-- Replace with a more secure policy that still allows public submissions
-- but validates that the submitter cannot set admin-only fields

DROP POLICY IF EXISTS "Anyone can submit events" ON event_submissions;

-- Create a new INSERT policy that allows public submissions
-- but restricts which fields can be set (status must be 'pending', admin_notes must be null)
CREATE POLICY "Public can submit events"
ON event_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending' AND 
  admin_notes IS NULL AND
  reviewed_at IS NULL
);