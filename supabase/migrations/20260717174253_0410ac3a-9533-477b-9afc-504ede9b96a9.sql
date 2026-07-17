DROP FUNCTION IF EXISTS public.list_assignable_users();

CREATE OR REPLACE FUNCTION public.list_assignable_users()
 RETURNS TABLE(id uuid, nome text, email text, role text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    u.id,
    COALESCE(NULLIF(p.nome, ''), ae.nome, split_part(u.email::text, '@', 1)) AS nome,
    u.email::text AS email,
    ae.role,
    p.avatar_url
  FROM public.allowed_emails ae
  JOIN auth.users u ON lower(u.email::text) = ae.email
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ae.role IN ('developer','administrador','builder')
    AND public.is_allowed_user()
  ORDER BY nome;
$function$;

GRANT EXECUTE ON FUNCTION public.list_assignable_users() TO authenticated;

-- Permite que qualquer usuário autorizado veja os campos públicos (nome, e-mail, avatar)
-- dos perfis. Sem isto, listBoardMembros não consegue exibir foto/nome dos colegas.
DROP POLICY IF EXISTS "Allowed users can view public profile fields" ON public.profiles;
CREATE POLICY "Allowed users can view public profile fields"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_allowed_user());