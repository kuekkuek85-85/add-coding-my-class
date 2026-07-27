-- Restrict direct storage.objects access for the private message-images bucket.
-- The app uploads via service_role (bypasses RLS) and serves images through signed URLs,
-- so denying anon/authenticated direct access is safe and closes the missing-policy finding.

DROP POLICY IF EXISTS "message-images: deny anon select" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny anon insert" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny anon update" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny anon delete" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny auth select" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny auth insert" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny auth update" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny auth delete" ON storage.objects;

CREATE POLICY "message-images: deny anon select" ON storage.objects
  FOR SELECT TO anon USING (bucket_id <> 'message-images');
CREATE POLICY "message-images: deny anon insert" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id <> 'message-images');
CREATE POLICY "message-images: deny anon update" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id <> 'message-images') WITH CHECK (bucket_id <> 'message-images');
CREATE POLICY "message-images: deny anon delete" ON storage.objects
  FOR DELETE TO anon USING (bucket_id <> 'message-images');

CREATE POLICY "message-images: deny auth select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id <> 'message-images');
CREATE POLICY "message-images: deny auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id <> 'message-images');
CREATE POLICY "message-images: deny auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id <> 'message-images') WITH CHECK (bucket_id <> 'message-images');
CREATE POLICY "message-images: deny auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id <> 'message-images');