
-- Add delete_token column to event_flags for anonymous withdrawal
ALTER TABLE public.event_flags ADD COLUMN delete_token uuid DEFAULT gen_random_uuid();

-- Create a security definer function to delete a flag by its delete_token
CREATE OR REPLACE FUNCTION public.delete_event_flag(_id uuid, _token uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.event_flags
  WHERE id = _id AND delete_token = _token
  RETURNING true;
$$;
