-- Helper: quem pode ver uma demanda (espelha demands_select_scoped)
CREATE OR REPLACE FUNCTION public.can_view_demand(_demand_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.demands d
     WHERE d.id = _demand_id
       AND (d.created_by = _user_id OR d.assigned_to = _user_id
            OR public.has_role(_user_id, 'admin'::app_role))
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_demand(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_demand(uuid, uuid) TO authenticated, service_role;

-- 1) Storage: anexos de demandas (path = <demand_id>/<arquivo>)
DROP POLICY IF EXISTS demand_attachments_read ON storage.objects;
CREATE POLICY demand_attachments_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'demand-attachments'
  AND public.can_view_demand(NULLIF((storage.foldername(name))[1], '')::uuid)
);

-- 2) Storage: anexos de atividades (path = <board_id>/<card_id>/<arquivo>)
DROP POLICY IF EXISTS atividades_anexos_select ON storage.objects;
CREATE POLICY atividades_anexos_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'atividades-anexos'
  AND public.is_allowed_user()
  AND public.atividades_can_view_board(NULLIF((storage.foldername(name))[1], '')::uuid)
);

-- 3) Storage: avatares (path = <user_id>/<arquivo>)
DROP POLICY IF EXISTS avatares_authenticated_read ON storage.objects;
CREATE POLICY avatares_authenticated_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'avatares'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_allowed_user()
  )
);

-- 4) Auditoria de demandas
DROP POLICY IF EXISTS "Authenticated read audit logs" ON public.demand_audit_logs;
CREATE POLICY "Audit logs readable by demand participants"
ON public.demand_audit_logs
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.can_view_demand(demand_id)
);

-- 5) SECURITY DEFINER: remover execução de anon/public; triggers não devem ser chamáveis via API
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, (p.prorettype = 'pg_catalog.trigger'::regtype) AS is_trigger
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.is_trigger THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END
$do$;