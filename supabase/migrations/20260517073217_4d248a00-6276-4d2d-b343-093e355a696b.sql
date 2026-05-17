
-- Allow public uploads to the flyer-images bucket (used by public Submit Event flow and admin Flyer Import).
DROP POLICY IF EXISTS "Anyone can upload flyer images" ON storage.objects;
CREATE POLICY "Anyone can upload flyer images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'flyer-images');

-- Public read (bucket is already public, but explicit policy for safety).
DROP POLICY IF EXISTS "Flyer images are publicly readable" ON storage.objects;
CREATE POLICY "Flyer images are publicly readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'flyer-images');

-- Admins can manage (update/delete) any flyer image.
DROP POLICY IF EXISTS "Admins can update flyer images" ON storage.objects;
CREATE POLICY "Admins can update flyer images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'flyer-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete flyer images" ON storage.objects;
CREATE POLICY "Admins can delete flyer images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'flyer-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
