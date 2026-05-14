
DROP POLICY IF EXISTS "Allowed users can upload plataforma-icones" ON storage.objects;
DROP POLICY IF EXISTS "Allowed users can update plataforma-icones" ON storage.objects;
DROP POLICY IF EXISTS "Allowed users can delete plataforma-icones" ON storage.objects;
DROP POLICY IF EXISTS "Public can download plataforma-icones" ON storage.objects;

CREATE POLICY "Allowed users can upload plataforma-icones"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'plataforma-icones' AND public.is_allowed_user());

CREATE POLICY "Allowed users can update plataforma-icones"
ON storage.objects FOR UPDATE
USING (bucket_id = 'plataforma-icones' AND public.is_allowed_user());

CREATE POLICY "Allowed users can delete plataforma-icones"
ON storage.objects FOR DELETE
USING (bucket_id = 'plataforma-icones' AND public.is_allowed_user());

CREATE POLICY "Public can download plataforma-icones"
ON storage.objects FOR SELECT
USING (bucket_id = 'plataforma-icones' AND (public.is_allowed_user() OR auth.role() = 'anon'));
