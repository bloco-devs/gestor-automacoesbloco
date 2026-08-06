DROP POLICY IF EXISTS "workflow_definitions read (allowed users)" ON public.workflow_definitions;
CREATE POLICY "workflow_definitions admin read"
ON public.workflow_definitions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "workflow_execution_logs read (allowed users)" ON public.workflow_execution_logs;
CREATE POLICY "workflow_execution_logs scoped read"
ON public.workflow_execution_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (demand_id IS NOT NULL AND public.can_view_demand(demand_id, auth.uid()))
);