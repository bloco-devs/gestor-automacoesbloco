CREATE POLICY "Fundos de quadro: enviar (própria pasta)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'boards-backgrounds' AND public.is_allowed_user() AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Fundos de quadro: ver (equipe permitida)"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'boards-backgrounds' AND public.is_allowed_user());

CREATE POLICY "Fundos de quadro: excluir (própria pasta)"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'boards-backgrounds' AND (storage.foldername(name))[1] = (auth.uid())::text);