
-- ============ demands: SELECT restrito ao dono para não-admin ============
DROP POLICY IF EXISTS "demands_select_all_authenticated" ON public.demands;

CREATE POLICY "demands_select_scoped"
  ON public.demands FOR SELECT
  TO authenticated
  USING (
    (
      deleted_at IS NULL
      AND (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ============ demand_comments: ocultar internas para não-admin ============
DROP POLICY IF EXISTS "Authenticated read comments" ON public.demand_comments;

CREATE POLICY "demand_comments_select_scoped"
  ON public.demand_comments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
    OR (
      is_internal = false
      AND EXISTS (
        SELECT 1 FROM public.demands d
         WHERE d.id = demand_comments.demand_id
           AND (d.created_by = auth.uid() OR d.assigned_to = auth.uid())
      )
    )
  );
