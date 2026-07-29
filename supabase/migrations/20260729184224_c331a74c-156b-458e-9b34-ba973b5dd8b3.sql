-- Event trigger helper: não deve ser chamável via API
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Listagens de pessoas: exigir membro autorizado da equipe dentro da própria função
CREATE OR REPLACE FUNCTION public.list_assignable_users()
RETURNS TABLE(id uuid, nome text, email text, role text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.nome, p.email, ae.role, p.avatar_url
    FROM public.profiles p
    JOIN public.allowed_emails ae ON ae.email = lower(p.email)
   WHERE ae.role IN ('developer', 'administrador')
     AND (public.is_allowed_user() OR public.has_role(auth.uid(), 'admin'::app_role))
   ORDER BY COALESCE(p.nome, p.email);
$$;

CREATE OR REPLACE FUNCTION public.get_user_workloads()
RETURNS TABLE(user_id uuid, nome text, email text, avatar_url text, active_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id, u.nome, u.email, u.avatar_url,
         COUNT(d.id) FILTER (
           WHERE d.deleted_at IS NULL
             AND d.status NOT IN ('concluido')
         ) AS active_count
    FROM public.list_assignable_users() u
    LEFT JOIN public.demands d ON d.assigned_to = u.id
   WHERE public.is_allowed_user() OR public.has_role(auth.uid(), 'admin'::app_role)
   GROUP BY u.id, u.nome, u.email, u.avatar_url;
$$;

REVOKE ALL ON FUNCTION public.list_assignable_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_workloads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_assignable_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_workloads() TO authenticated, service_role;