
-- Ensure anon/authenticated have table-level INSERT privilege (RLS still applies).
GRANT INSERT ON public.event_submissions TO anon, authenticated;

-- Recreate the insert policy with a simpler check so client-side inserts succeed
-- even if the client omits status/admin_notes/reviewed_at (defaults already cover them).
DROP POLICY IF EXISTS "Anyone can submit events" ON public.event_submissions;
CREATE POLICY "Anyone can submit events"
ON public.event_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'::submission_status
  AND admin_notes IS NULL
  AND reviewed_at IS NULL
  AND char_length(COALESCE(title, '')) BETWEEN 1 AND 200
  AND char_length(COALESCE(submitter_email, '')) BETWEEN 3 AND 200
);
