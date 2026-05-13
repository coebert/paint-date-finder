-- 1. Drop redundant public INSERT policy on field_layouts (RPC handles creation)
DROP POLICY IF EXISTS "Anyone can create layouts" ON public.field_layouts;

-- 2. Tighten user_visits insert policy
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.user_visits;
CREATE POLICY "Anyone can insert visits"
ON public.user_visits
FOR INSERT
TO public
WITH CHECK (
  char_length(COALESCE(page_path, '')) <= 500
  AND char_length(COALESCE(session_id, '')) <= 100
);

-- 3. Restrict storage bucket listing
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Flyer images are publicly viewable" ON storage.objects;

-- 4. Relocate pg_net out of public schema (requires drop/recreate)
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
