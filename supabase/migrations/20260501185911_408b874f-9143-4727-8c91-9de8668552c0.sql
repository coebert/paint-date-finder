-- 1. Public bucket for flyer originals
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flyer-images',
  'flyer-images',
  true,
  26214400, -- 25 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage policies
DROP POLICY IF EXISTS "Flyer images are publicly viewable" ON storage.objects;
CREATE POLICY "Flyer images are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'flyer-images');

DROP POLICY IF EXISTS "Anyone can upload flyer images" ON storage.objects;
CREATE POLICY "Anyone can upload flyer images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'flyer-images');

DROP POLICY IF EXISTS "Admins can update flyer images" ON storage.objects;
CREATE POLICY "Admins can update flyer images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'flyer-images' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete flyer images" ON storage.objects;
CREATE POLICY "Admins can delete flyer images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'flyer-images' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Carry the flyer through submission review
ALTER TABLE public.event_submissions
  ADD COLUMN IF NOT EXISTS image_url text;