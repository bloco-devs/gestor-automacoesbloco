-- 1. Add role + nome columns to allowed_emails
ALTER TABLE public.allowed_emails
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'requester',
  ADD COLUMN IF NOT EXISTS nome text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'allowed_emails_role_check'
  ) THEN
    ALTER TABLE public.allowed_emails
      ADD CONSTRAINT allowed_emails_role_check
      CHECK (role IN ('developer','requester','builder'));
  END IF;
END $$;

-- 2. Seed current devs
UPDATE public.allowed_emails
SET role = 'developer'
WHERE email IN ('blococcomercial@gmail.com','riccellycivil@gmail.com');

-- 3. Sync trigger: keep user_roles 'admin' aligned with allowed_emails.role='developer'
CREATE OR REPLACE FUNCTION public.sync_allowed_email_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = NEW.email LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.role = 'developer' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (v_uid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'::app_role;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_allowed_email_admin ON public.allowed_emails;
CREATE TRIGGER trg_sync_allowed_email_admin
AFTER INSERT OR UPDATE OF role ON public.allowed_emails
FOR EACH ROW EXECUTE FUNCTION public.sync_allowed_email_admin();

-- 4. Cleanup trigger: when allowed_emails row is deleted, remove admin role too
CREATE OR REPLACE FUNCTION public.cleanup_allowed_email_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = OLD.email LIMIT 1;
  IF v_uid IS NOT NULL THEN
    DELETE FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'::app_role;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_cleanup_allowed_email_admin ON public.allowed_emails;
CREATE TRIGGER trg_cleanup_allowed_email_admin
AFTER DELETE ON public.allowed_emails
FOR EACH ROW EXECUTE FUNCTION public.cleanup_allowed_email_admin();

-- 5. Extend handle_new_user to seed user_roles 'admin' if allowed_emails.role = 'developer'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.solicitacoes
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS DISTINCT FROM NEW.id;

  SELECT role INTO v_role
  FROM public.allowed_emails
  WHERE email = lower(NEW.email);

  IF v_role = 'developer' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

-- 6. RPC: read my own role (used by useAuth)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ae.role
      FROM public.allowed_emails ae
      JOIN auth.users u ON lower(u.email) = ae.email
      WHERE u.id = auth.uid()
    ),
    'requester'
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 7. RPC: admin-only listing of accounts joined with profile + auth status
CREATE OR REPLACE FUNCTION public.admin_list_accounts()
RETURNS TABLE(
  email text,
  role text,
  nome text,
  profile_nome text,
  user_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ae.email,
    ae.role,
    ae.nome,
    p.nome AS profile_nome,
    u.id AS user_id,
    ae.created_at
  FROM public.allowed_emails ae
  LEFT JOIN auth.users u ON lower(u.email) = ae.email
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY ae.email;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated;