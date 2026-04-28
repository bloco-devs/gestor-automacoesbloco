-- Harden solicitacoes insert ownership so sensitive personal records cannot be created without an owner
DROP POLICY IF EXISTS "Authenticated users can submit own solicitacao" ON public.solicitacoes;

CREATE POLICY "Authenticated users can submit own solicitacao"
ON public.solicitacoes
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

-- Add admin-only maintenance policies for activity logs
DROP POLICY IF EXISTS "Admins can update activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can delete activity_log" ON public.activity_log;

CREATE POLICY "Admins can update activity_log"
ON public.activity_log
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete activity_log"
ON public.activity_log
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));