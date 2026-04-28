-- Automatically synchronize the single developer role from profile email
CREATE OR REPLACE FUNCTION public.sync_single_developer_role_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'blococcomercial@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id
      AND role = 'admin'::public.app_role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_single_developer_role_from_profile_on_profiles ON public.profiles;
CREATE TRIGGER sync_single_developer_role_from_profile_on_profiles
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_single_developer_role_from_profile();

REVOKE ALL ON FUNCTION public.sync_single_developer_role_from_profile() FROM PUBLIC, anon, authenticated;