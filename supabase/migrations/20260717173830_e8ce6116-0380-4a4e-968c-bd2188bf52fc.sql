
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

DROP FUNCTION IF EXISTS public.list_assignable_users();
CREATE OR REPLACE FUNCTION public.list_assignable_users()
RETURNS TABLE(id uuid, nome text, email text, role text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.list_assignable_users() TO authenticated;

DROP POLICY IF EXISTS "avatares_authenticated_read" ON storage.objects;
CREATE POLICY "avatares_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatares');

DROP POLICY IF EXISTS "avatares_owner_insert" ON storage.objects;
CREATE POLICY "avatares_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatares_owner_update" ON storage.objects;
CREATE POLICY "avatares_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatares_owner_delete" ON storage.objects;
CREATE POLICY "avatares_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
