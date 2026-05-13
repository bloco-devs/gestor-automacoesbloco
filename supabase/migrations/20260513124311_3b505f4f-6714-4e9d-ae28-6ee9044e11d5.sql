-- Allow solicitação owners to view soluções linked to their own solicitações
CREATE POLICY "Owners can view own solucoes"
ON public.demanda_solucoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.solicitacoes s
    WHERE s.id = demanda_solucoes.solicitacao_id
      AND s.user_id = auth.uid()
  )
);

-- Allow solicitação owners to open a chamado (insert task) on a solução linked to their own solicitação
CREATE POLICY "Owners can open chamado on own solucao"
ON public.solucao_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demanda_solucoes ds
    JOIN public.solicitacoes s ON s.id = ds.solicitacao_id
    WHERE ds.id = solucao_tasks.solucao_id
      AND s.user_id = auth.uid()
  )
);

-- Allow solicitação owners to view tasks of soluções linked to their own solicitações
CREATE POLICY "Owners can view tasks of own solucao"
ON public.solucao_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demanda_solucoes ds
    JOIN public.solicitacoes s ON s.id = ds.solicitacao_id
    WHERE ds.id = solucao_tasks.solucao_id
      AND s.user_id = auth.uid()
  )
);