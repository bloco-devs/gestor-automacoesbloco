
-- 1. demanda_solucoes: default created_by + restringir update/delete ao autor/admin
ALTER TABLE public.demanda_solucoes ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allowed users can view demanda_solucoes" ON public.demanda_solucoes;
DROP POLICY IF EXISTS "Allowed users can update demanda_solucoes" ON public.demanda_solucoes;
DROP POLICY IF EXISTS "Allowed users can delete demanda_solucoes" ON public.demanda_solucoes;
DROP POLICY IF EXISTS "Allowed users can insert demanda_solucoes" ON public.demanda_solucoes;

CREATE POLICY "Admins can view all demanda_solucoes"
  ON public.demanda_solucoes FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors can view own demanda_solucoes"
  ON public.demanda_solucoes FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Allowed users can insert own demanda_solucoes"
  ON public.demanda_solucoes FOR INSERT TO authenticated
  WITH CHECK (
    private.is_allowed_user()
    AND (created_by IS NULL OR created_by = auth.uid())
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.solicitacoes s
        WHERE s.id = demanda_solucoes.solicitacao_id
          AND s.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Author or admin can update demanda_solucoes"
  ON public.demanda_solucoes FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
  );

CREATE POLICY "Author or admin can delete demanda_solucoes"
  ON public.demanda_solucoes FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
  );

-- 2. solicitacoes: remover SELECT amplo para allowed users
DROP POLICY IF EXISTS "Allowed users can view solicitacoes" ON public.solicitacoes;

-- 3. solicitacoes_score_history: remover SELECT amplo
DROP POLICY IF EXISTS "Allowed users can view score history" ON public.solicitacoes_score_history;

-- 4. demanda_melhorias: restringir SELECT
DROP POLICY IF EXISTS "Allowed users can view demanda_melhorias" ON public.demanda_melhorias;

CREATE POLICY "Admins can view all demanda_melhorias"
  ON public.demanda_melhorias FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can view demanda_melhorias of own solucoes"
  ON public.demanda_melhorias FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.demanda_solucoes ds
      JOIN public.solicitacoes s ON s.id = ds.solicitacao_id
      WHERE ds.id = demanda_melhorias.solucao_id
        AND s.user_id = auth.uid()
    )
  );

-- 5. demanda_tasks: remover SELECT amplo, manter Devs + adicionar owner
DROP POLICY IF EXISTS "Allowed users can view demanda_tasks" ON public.demanda_tasks;

CREATE POLICY "Owners can view tasks of own solicitacao"
  ON public.demanda_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = demanda_tasks.solicitacao_id
        AND s.user_id = auth.uid()
    )
  );

-- 6. solucao_tasks: remover SELECT amplo (Devs e Owners já têm policies próprias)
DROP POLICY IF EXISTS "Allowed users can view solucao_tasks" ON public.solucao_tasks;
