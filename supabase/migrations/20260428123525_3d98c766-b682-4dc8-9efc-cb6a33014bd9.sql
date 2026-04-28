DROP POLICY IF EXISTS "Anyone can submit a solicitacao" ON public.solicitacoes;

CREATE POLICY "Authenticated users can submit own solicitacao"
ON public.solicitacoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);