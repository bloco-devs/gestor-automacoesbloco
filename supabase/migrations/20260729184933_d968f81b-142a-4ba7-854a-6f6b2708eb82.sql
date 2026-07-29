-- 1) demand_tasks: escopo por propriedade da demanda
DROP POLICY IF EXISTS "Authenticated can read demand tasks" ON public.demand_tasks;
DROP POLICY IF EXISTS "Authenticated can insert demand tasks" ON public.demand_tasks;
DROP POLICY IF EXISTS "Authenticated can update demand tasks" ON public.demand_tasks;
DROP POLICY IF EXISTS "Authenticated can delete demand tasks" ON public.demand_tasks;

CREATE POLICY "Demand participants can read tasks"
  ON public.demand_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_tasks.demand_id
        AND d.deleted_at IS NULL
    )
    AND public.can_view_demand(demand_tasks.demand_id, auth.uid())
  );

CREATE POLICY "Demand participants can insert tasks"
  ON public.demand_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_tasks.demand_id
        AND d.deleted_at IS NULL
    )
    AND public.can_view_demand(demand_tasks.demand_id, auth.uid())
  );

CREATE POLICY "Demand participants can update tasks"
  ON public.demand_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_tasks.demand_id
        AND d.deleted_at IS NULL
    )
    AND public.can_view_demand(demand_tasks.demand_id, auth.uid())
  )
  WITH CHECK (
    public.can_view_demand(demand_tasks.demand_id, auth.uid())
  );

CREATE POLICY "Demand participants can delete tasks"
  ON public.demand_tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_tasks.demand_id
        AND d.deleted_at IS NULL
    )
    AND public.can_view_demand(demand_tasks.demand_id, auth.uid())
  );

-- 2) atividades_anexos: exigir visibilidade do quadro
DROP POLICY IF EXISTS "anexos_select_allowed" ON public.atividades_anexos;
CREATE POLICY "anexos_select_board_visible"
  ON public.atividades_anexos FOR SELECT TO authenticated
  USING (public.atividades_can_view_board(board_id, auth.uid()));

-- 3) atividades_colunas: exigir visibilidade do quadro
DROP POLICY IF EXISTS "Allowed users can view atividades_colunas" ON public.atividades_colunas;
CREATE POLICY "colunas_select_board_visible"
  ON public.atividades_colunas FOR SELECT TO authenticated
  USING (public.atividades_can_view_board(board_id, auth.uid()));