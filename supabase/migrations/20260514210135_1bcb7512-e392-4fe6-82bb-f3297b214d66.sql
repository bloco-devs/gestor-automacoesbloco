
CREATE POLICY "Allowed users can view solicitacoes"
  ON public.solicitacoes FOR SELECT
  TO authenticated
  USING (private.is_allowed_user());

CREATE POLICY "Allowed users can view demanda_tasks"
  ON public.demanda_tasks FOR SELECT
  TO authenticated
  USING (private.is_allowed_user());

CREATE POLICY "Allowed users can view solucao_tasks"
  ON public.solucao_tasks FOR SELECT
  TO authenticated
  USING (private.is_allowed_user());

CREATE POLICY "Allowed users can view score history"
  ON public.solicitacoes_score_history FOR SELECT
  TO authenticated
  USING (private.is_allowed_user());
