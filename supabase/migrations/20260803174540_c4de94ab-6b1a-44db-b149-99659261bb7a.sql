DROP POLICY IF EXISTS "Icones de quadro: ver (logados)" ON storage.objects;
CREATE POLICY "Icones de quadro: ver (equipe permitida)"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'boards_icons' AND public.is_allowed_user());