CREATE OR REPLACE FUNCTION public.uuid_ou_nulo(_texto text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
BEGIN
  RETURN _texto::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.uuid_ou_nulo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.uuid_ou_nulo(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_view_demand(_demand_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND _demand_id IS NOT NULL AND (
    (_user_id = auth.uid() AND public.is_equipe())
    OR EXISTS (
      SELECT 1 FROM public.demands d
       WHERE d.id = _demand_id
         AND (d.created_by = _user_id
              OR d.assigned_to = _user_id
              OR public.has_role(_user_id, 'admin'::app_role))
    )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_demand(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_demand(uuid, uuid) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_attachments TO authenticated;

DROP POLICY IF EXISTS demand_attachments_select ON public.demand_attachments;
CREATE POLICY demand_attachments_select ON public.demand_attachments
FOR SELECT TO authenticated
USING (public.can_view_demand(demand_id, auth.uid()));

DROP POLICY IF EXISTS demand_attachments_insert ON public.demand_attachments;
CREATE POLICY demand_attachments_insert ON public.demand_attachments
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.can_view_demand(demand_id, auth.uid())
  AND EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.deleted_at IS NULL)
);

DROP POLICY IF EXISTS demand_attachments_delete ON public.demand_attachments;
CREATE POLICY demand_attachments_delete ON public.demand_attachments
FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.created_by = auth.uid())
);

CREATE INDEX IF NOT EXISTS demand_attachments_file_url_idx
  ON public.demand_attachments (file_url);

DROP POLICY IF EXISTS demand_attachments_read ON storage.objects;
CREATE POLICY demand_attachments_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'demand-attachments'
  AND (
    public.can_view_demand(public.uuid_ou_nulo((storage.foldername(name))[1]), auth.uid())
    OR (
      (storage.foldername(name))[1] = 'rascunhos'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM public.demand_attachments a
       WHERE a.file_url = objects.name
         AND public.can_view_demand(a.demand_id, auth.uid())
    )
  )
);

DROP POLICY IF EXISTS demand_attachments_upload ON storage.objects;
CREATE POLICY demand_attachments_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'demand-attachments'
  AND (
    public.can_view_demand(public.uuid_ou_nulo((storage.foldername(name))[1]), auth.uid())
    OR (
      (storage.foldername(name))[1] = 'rascunhos'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

DROP POLICY IF EXISTS demand_attachments_promover_rascunho ON storage.objects;
CREATE POLICY demand_attachments_promover_rascunho ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'demand-attachments'
  AND (storage.foldername(name))[1] = 'rascunhos'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'demand-attachments'
  AND public.can_view_demand(public.uuid_ou_nulo((storage.foldername(name))[1]), auth.uid())
);

DROP POLICY IF EXISTS demand_attachments_delete_own ON storage.objects;
CREATE POLICY demand_attachments_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'demand-attachments'
  AND (
    owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'rascunhos'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);