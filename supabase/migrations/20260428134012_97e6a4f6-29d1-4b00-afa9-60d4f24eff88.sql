-- Allow authenticated users to execute helper functions used by RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_allowed_user() TO authenticated;

-- Keep helper functions private from anonymous callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_allowed_user() FROM anon;

-- Ensure the role enforcement trigger exists on user_roles
DROP TRIGGER IF EXISTS enforce_single_developer_role_on_user_roles ON public.user_roles;
CREATE TRIGGER enforce_single_developer_role_on_user_roles
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_developer_role();

-- Ensure profile changes automatically sync the single developer role
DROP TRIGGER IF EXISTS sync_single_developer_role_from_profile_on_profiles ON public.profiles;
CREATE TRIGGER sync_single_developer_role_from_profile_on_profiles
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_single_developer_role_from_profile();

-- Guarantee the current authorized account has the developer role
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = 'blococcomercial@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove developer access from any other account
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role = 'admin'::public.app_role
  AND lower(p.email) <> 'blococcomercial@gmail.com';