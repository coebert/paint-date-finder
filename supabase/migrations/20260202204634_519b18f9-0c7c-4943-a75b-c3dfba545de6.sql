-- Add policy to allow users to view their own role assignments
-- This prevents authorization issues where users can't check their own permissions

CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);