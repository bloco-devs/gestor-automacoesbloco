DROP POLICY IF EXISTS demand_attachments_upload ON storage.objects;
CREATE POLICY demand_attachments_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'demand-attachments'
  AND owner = auth.uid()
  AND public.can_view_demand((NULLIF((storage.foldername(name))[1], ''))::uuid, auth.uid())
);