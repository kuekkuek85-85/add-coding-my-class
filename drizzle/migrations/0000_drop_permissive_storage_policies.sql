DROP POLICY IF EXISTS "message-images: deny anon delete" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny anon insert" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny anon select" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny anon update" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny auth delete" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny auth insert" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny auth select" ON storage.objects;
DROP POLICY IF EXISTS "message-images: deny auth update" ON storage.objects;