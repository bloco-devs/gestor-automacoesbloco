-- Create a private schema for internal RLS helper functions
CREATE SCHEMA IF NOT EXISTS private;

-- Private role checker used by RLS policies
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Private allowed-user checker used by RLS policies
CREATE OR REPLACE FUNCTION private.is_allowed_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_emails ae
    JOIN auth.users u ON lower(u.email) = ae.email
    WHERE u.id = auth.uid()
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_allowed_user() TO authenticated;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION private.is_allowed_user() FROM anon;

-- Prevent direct API calls to public SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_allowed_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_single_developer_role() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_single_developer_role_from_profile() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;

-- activity_log policies
DROP POLICY IF EXISTS "Admins can delete activity_log" ON public.activity_log;
CREATE POLICY "Admins can delete activity_log" ON public.activity_log
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update activity_log" ON public.activity_log;
CREATE POLICY "Admins can update activity_log" ON public.activity_log
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all activity_log" ON public.activity_log;
CREATE POLICY "Admins can view all activity_log" ON public.activity_log
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Allowed users can insert activity_log" ON public.activity_log;
CREATE POLICY "Allowed users can insert activity_log" ON public.activity_log
FOR INSERT TO authenticated
WITH CHECK (private.is_allowed_user() AND auth.uid() = user_id);

-- allowed_emails policies
DROP POLICY IF EXISTS "Only admins can delete allowed_emails" ON public.allowed_emails;
CREATE POLICY "Only admins can delete allowed_emails" ON public.allowed_emails
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can insert allowed_emails" ON public.allowed_emails;
CREATE POLICY "Only admins can insert allowed_emails" ON public.allowed_emails
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can update allowed_emails" ON public.allowed_emails;
CREATE POLICY "Only admins can update allowed_emails" ON public.allowed_emails
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can view allowed_emails" ON public.allowed_emails;
CREATE POLICY "Only admins can view allowed_emails" ON public.allowed_emails
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- allowed-user table policies
DROP POLICY IF EXISTS "Allowed users can delete criterios" ON public.criterios_solucoes;
CREATE POLICY "Allowed users can delete criterios" ON public.criterios_solucoes
FOR DELETE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can insert criterios" ON public.criterios_solucoes;
CREATE POLICY "Allowed users can insert criterios" ON public.criterios_solucoes
FOR INSERT TO authenticated WITH CHECK (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can update criterios" ON public.criterios_solucoes;
CREATE POLICY "Allowed users can update criterios" ON public.criterios_solucoes
FOR UPDATE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can view criterios" ON public.criterios_solucoes;
CREATE POLICY "Allowed users can view criterios" ON public.criterios_solucoes
FOR SELECT TO authenticated USING (private.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can delete demanda_melhorias" ON public.demanda_melhorias;
CREATE POLICY "Allowed users can delete demanda_melhorias" ON public.demanda_melhorias
FOR DELETE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can insert demanda_melhorias" ON public.demanda_melhorias;
CREATE POLICY "Allowed users can insert demanda_melhorias" ON public.demanda_melhorias
FOR INSERT TO authenticated WITH CHECK (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can update demanda_melhorias" ON public.demanda_melhorias;
CREATE POLICY "Allowed users can update demanda_melhorias" ON public.demanda_melhorias
FOR UPDATE TO authenticated USING (private.is_allowed_user()) WITH CHECK (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can view demanda_melhorias" ON public.demanda_melhorias;
CREATE POLICY "Allowed users can view demanda_melhorias" ON public.demanda_melhorias
FOR SELECT TO authenticated USING (private.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can delete demanda_solucoes" ON public.demanda_solucoes;
CREATE POLICY "Allowed users can delete demanda_solucoes" ON public.demanda_solucoes
FOR DELETE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can insert demanda_solucoes" ON public.demanda_solucoes;
CREATE POLICY "Allowed users can insert demanda_solucoes" ON public.demanda_solucoes
FOR INSERT TO authenticated WITH CHECK (private.is_allowed_user() AND (created_by IS NULL OR created_by = auth.uid()));
DROP POLICY IF EXISTS "Allowed users can update demanda_solucoes" ON public.demanda_solucoes;
CREATE POLICY "Allowed users can update demanda_solucoes" ON public.demanda_solucoes
FOR UPDATE TO authenticated USING (private.is_allowed_user()) WITH CHECK (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can view demanda_solucoes" ON public.demanda_solucoes;
CREATE POLICY "Allowed users can view demanda_solucoes" ON public.demanda_solucoes
FOR SELECT TO authenticated USING (private.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can delete plataformas" ON public.plataformas;
CREATE POLICY "Allowed users can delete plataformas" ON public.plataformas
FOR DELETE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can insert plataformas" ON public.plataformas;
CREATE POLICY "Allowed users can insert plataformas" ON public.plataformas
FOR INSERT TO authenticated WITH CHECK (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can update plataformas" ON public.plataformas;
CREATE POLICY "Allowed users can update plataformas" ON public.plataformas
FOR UPDATE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can view plataformas" ON public.plataformas;
CREATE POLICY "Allowed users can view plataformas" ON public.plataformas
FOR SELECT TO authenticated USING (private.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can delete setores" ON public.setores;
CREATE POLICY "Allowed users can delete setores" ON public.setores
FOR DELETE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can insert setores" ON public.setores;
CREATE POLICY "Allowed users can insert setores" ON public.setores
FOR INSERT TO authenticated WITH CHECK (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can update setores" ON public.setores;
CREATE POLICY "Allowed users can update setores" ON public.setores
FOR UPDATE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can view setores" ON public.setores;
CREATE POLICY "Allowed users can view setores" ON public.setores
FOR SELECT TO authenticated USING (private.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can delete solucoes" ON public.solucoes;
CREATE POLICY "Allowed users can delete solucoes" ON public.solucoes
FOR DELETE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can insert solucoes" ON public.solucoes;
CREATE POLICY "Allowed users can insert solucoes" ON public.solucoes
FOR INSERT TO authenticated WITH CHECK (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can update solucoes" ON public.solucoes;
CREATE POLICY "Allowed users can update solucoes" ON public.solucoes
FOR UPDATE TO authenticated USING (private.is_allowed_user());
DROP POLICY IF EXISTS "Allowed users can view solucoes" ON public.solucoes;
CREATE POLICY "Allowed users can view solucoes" ON public.solucoes
FOR SELECT TO authenticated USING (private.is_allowed_user());

-- profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- solicitacoes policies
DROP POLICY IF EXISTS "Admins can delete solicitacoes" ON public.solicitacoes;
CREATE POLICY "Admins can delete solicitacoes" ON public.solicitacoes
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update all solicitacoes" ON public.solicitacoes;
CREATE POLICY "Admins can update all solicitacoes" ON public.solicitacoes
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all solicitacoes" ON public.solicitacoes;
CREATE POLICY "Admins can view all solicitacoes" ON public.solicitacoes
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can delete roles (restrictive)" ON public.user_roles;
CREATE POLICY "Only admins can delete roles (restrictive)" ON public.user_roles
AS RESTRICTIVE FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can insert roles (restrictive)" ON public.user_roles;
CREATE POLICY "Only admins can insert roles (restrictive)" ON public.user_roles
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can update roles (restrictive)" ON public.user_roles;
CREATE POLICY "Only admins can update roles (restrictive)" ON public.user_roles
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));