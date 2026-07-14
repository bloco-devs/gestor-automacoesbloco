
-- RFC-001 Fase 4 — RLS para bucket atividades-import-tmp
DROP POLICY IF EXISTS "importer_tmp_owner_select" ON storage.objects;
CREATE POLICY "importer_tmp_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'atividades-import-tmp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "importer_tmp_owner_insert" ON storage.objects;
CREATE POLICY "importer_tmp_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'atividades-import-tmp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "importer_tmp_owner_delete" ON storage.objects;
CREATE POLICY "importer_tmp_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'atividades-import-tmp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
