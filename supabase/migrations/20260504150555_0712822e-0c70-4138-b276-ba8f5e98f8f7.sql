CREATE POLICY "Allowed users can view all solicitacoes"
ON public.solicitacoes
FOR SELECT
TO authenticated
USING (private.is_allowed_user());