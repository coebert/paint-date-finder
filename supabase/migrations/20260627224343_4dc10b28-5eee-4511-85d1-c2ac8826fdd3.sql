
-- 1) event_flags: hide delete_token from anon/authenticated SELECTs
REVOKE SELECT (delete_token) ON public.event_flags FROM anon, authenticated;

-- 2) event_submissions: hide submitter_email from anon/authenticated columns.
-- Admin SELECT still works because admins go through the SECURITY DEFINER
-- get_admin_* helpers / service_role; non-admin paths (even if they ever
-- gained SELECT) cannot read this column.
REVOKE SELECT (submitter_email) ON public.event_submissions FROM anon, authenticated;

-- 3) user_visits: tighten INSERT so anon can't spoof a user_id and authenticated
-- users can only insert rows for themselves.
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.user_visits;

CREATE POLICY "Anon can insert anonymous visits"
ON public.user_visits
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND char_length(COALESCE(page_path, '')) <= 500
  AND char_length(COALESCE(session_id, '')) <= 100
);

CREATE POLICY "Users can insert their own visits"
ON public.user_visits
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND char_length(COALESCE(page_path, '')) <= 500
  AND char_length(COALESCE(session_id, '')) <= 100
);
