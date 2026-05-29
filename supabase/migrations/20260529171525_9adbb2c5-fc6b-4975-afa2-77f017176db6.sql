
-- Add responsavel_id to demanda_solucoes
ALTER TABLE public.demanda_solucoes ADD COLUMN IF NOT EXISTS responsavel_id uuid;
CREATE INDEX IF NOT EXISTS demanda_solucoes_responsavel_id_idx ON public.demanda_solucoes(responsavel_id);

-- Function to list users that can be assigned as responsible (devs/admins + builders)
CREATE OR REPLACE FUNCTION public.list_assignable_users()
RETURNS TABLE(id uuid, nome text, email text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    COALESCE(NULLIF(p.nome, ''), ae.nome, split_part(u.email::text, '@', 1)) AS nome,
    u.email::text AS email,
    ae.role
  FROM public.allowed_emails ae
  JOIN auth.users u ON lower(u.email::text) = ae.email
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ae.role IN ('developer','administrador','builder')
    AND public.is_allowed_user()
  ORDER BY nome;
$$;

GRANT EXECUTE ON FUNCTION public.list_assignable_users() TO authenticated;
