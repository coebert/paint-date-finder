-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Public can submit events" ON public.event_submissions;

-- Create a permissive policy that allows anyone to insert submissions
CREATE POLICY "Anyone can submit events"
ON public.event_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'::submission_status 
  AND admin_notes IS NULL 
  AND reviewed_at IS NULL
);