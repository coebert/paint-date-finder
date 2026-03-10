
-- Add a delete token column for ownership verification
ALTER TABLE public.field_layouts ADD COLUMN delete_token uuid DEFAULT gen_random_uuid();

-- Function to delete a layout by verifying the token
CREATE OR REPLACE FUNCTION public.delete_field_layout(_id uuid, _token uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.field_layouts
  WHERE id = _id AND delete_token = _token
  RETURNING true;
$$;
