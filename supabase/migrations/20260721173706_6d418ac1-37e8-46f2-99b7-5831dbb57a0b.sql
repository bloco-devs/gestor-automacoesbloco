CREATE POLICY "demand_attachments_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'demand-attachments');

CREATE POLICY "demand_attachments_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'demand-attachments' AND owner = auth.uid());

CREATE POLICY "demand_attachments_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'demand-attachments' AND owner = auth.uid());