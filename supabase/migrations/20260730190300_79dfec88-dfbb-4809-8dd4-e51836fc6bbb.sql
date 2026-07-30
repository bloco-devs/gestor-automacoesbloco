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

REVOKE EXECUTE ON FUNCTION public.list_equipe_users() FROM anon, PUBLIC;