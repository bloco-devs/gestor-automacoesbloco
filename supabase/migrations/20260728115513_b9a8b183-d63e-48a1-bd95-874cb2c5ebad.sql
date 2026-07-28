CREATE POLICY "Usuários autorizados veem os perfis da equipe"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_allowed_user());