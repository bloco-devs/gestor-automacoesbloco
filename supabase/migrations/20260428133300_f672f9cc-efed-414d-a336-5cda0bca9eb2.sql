-- Ensure only the configured Bloco commercial email can hold the admin/developer role
CREATE OR REPLACE FUNCTION public.enforce_single_developer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_email text;
BEGIN
  IF NEW.role = 'admin'::public.app_role THEN
    SELECT lower(email)
      INTO target_email
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF target_email IS DISTINCT FROM 'blococcomercial@gmail.com' THEN
      RAISE EXCEPTION 'Only blococcomercial@gmail.com can be assigned the developer role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_developer_role_on_user_roles ON public.user_roles;
CREATE TRIGGER enforce_single_developer_role_on_user_roles
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_developer_role();

-- Remove admin/developer role from every other user
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role = 'admin'::public.app_role
  AND lower(p.email) <> 'blococcomercial@gmail.com';

-- Grant admin/developer role to the configured email if the user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = 'blococcomercial@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

REVOKE ALL ON FUNCTION public.enforce_single_developer_role() FROM PUBLIC, anon, authenticated;