-- =========================================================
-- 1) user_roles: políticas RESTRICTIVE para impedir escalação
-- =========================================================

-- Garante que apenas admins podem INSERT/UPDATE/DELETE em user_roles,
-- mesmo se outras políticas permissivas existirem.
CREATE POLICY "Only admins can insert roles (restrictive)"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles (restrictive)"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles (restrictive)"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Bloqueia totalmente o role anon
CREATE POLICY "Anon cannot access user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- =========================================================
-- 2) allowed_emails: só admins gerenciam a lista
-- =========================================================

-- Substituir as policies atuais (que só checam is_allowed_user)
DROP POLICY IF EXISTS "Allowed users can insert allowed_emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Allowed users can update allowed_emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Allowed users can delete allowed_emails" ON public.allowed_emails;

CREATE POLICY "Only admins can insert allowed_emails"
  ON public.allowed_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update allowed_emails"
  ON public.allowed_emails
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete allowed_emails"
  ON public.allowed_emails
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- =========================================================
-- 3) Realtime: autorização de canais (realtime.messages)
-- =========================================================

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Por padrão, ninguém recebe mensagens. Liberamos seletivamente.
-- Admins podem se inscrever em qualquer canal.
CREATE POLICY "Admins can subscribe to all channels"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários autenticados (não admins) só recebem mensagens em canais privados
-- nomeados como "user:<auth.uid()>" (padrão para canais por usuário).
CREATE POLICY "Users can subscribe to their own channel"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = ('user:' || auth.uid()::text)
  );