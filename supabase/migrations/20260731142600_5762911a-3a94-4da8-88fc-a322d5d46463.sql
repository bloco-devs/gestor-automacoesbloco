DROP POLICY IF EXISTS "Icones de quadro: ver (logados)" ON storage.objects;
CREATE POLICY "Icones de quadro: ver (logados)"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'boards_icons');

DROP POLICY IF EXISTS "Icones de quadro: enviar (propria pasta)" ON storage.objects;
CREATE POLICY "Icones de quadro: enviar (propria pasta)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'boards_icons' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Icones de quadro: atualizar (propria pasta)" ON storage.objects;
CREATE POLICY "Icones de quadro: atualizar (propria pasta)"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'boards_icons' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'boards_icons' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Icones de quadro: remover (propria pasta)" ON storage.objects;
CREATE POLICY "Icones de quadro: remover (propria pasta)"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'boards_icons' AND (storage.foldername(name))[1] = auth.uid()::text);