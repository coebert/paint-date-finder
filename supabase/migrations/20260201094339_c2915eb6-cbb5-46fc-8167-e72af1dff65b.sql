-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view approved submissions" ON public.event_submissions;

-- Create a new policy that allows viewing all submissions (for moderation purposes)
CREATE POLICY "Anyone can view all submissions"
ON public.event_submissions
FOR SELECT
USING (true);