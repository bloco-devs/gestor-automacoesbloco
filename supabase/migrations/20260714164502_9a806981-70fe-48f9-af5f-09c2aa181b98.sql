
-- Ler capa: qualquer allowed_user
CREATE POLICY "Capas: visualizar (allowed_user)"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'atividades-capas' AND public.is_allowed_user());

-- Inserir capa: apenas admin do board (path = boardId/...)
CREATE POLICY "Capas: enviar (admin board)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'atividades-capas'
  AND public.atividades_can_admin_board((storage.foldername(name))[1]::uuid)
);

-- Atualizar capa: admin do board
CREATE POLICY "Capas: atualizar (admin board)"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'atividades-capas'
  AND public.atividades_can_admin_board((storage.foldername(name))[1]::uuid)
);

-- Deletar capa: admin do board
CREATE POLICY "Capas: excluir (admin board)"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'atividades-capas'
  AND public.atividades_can_admin_board((storage.foldername(name))[1]::uuid)
);
