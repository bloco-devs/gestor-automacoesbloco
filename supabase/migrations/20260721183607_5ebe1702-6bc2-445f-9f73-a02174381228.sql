CREATE OR REPLACE FUNCTION public.get_user_workloads()
RETURNS TABLE(user_id uuid, nome text, email text, avatar_url text, active_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.nome,
    p.email,
    p.avatar_url,
    COALESCE(d.cnt, 0) AS active_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT assigned_to, COUNT(*)::bigint AS cnt
    FROM public.demands
    WHERE deleted_at IS NULL
      AND status <> 'concluido'
      AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  ) d ON d.assigned_to = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.allowed_emails ae WHERE ae.email = lower(p.email)
  )
  ORDER BY COALESCE(d.cnt, 0) ASC, p.nome ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workloads() TO authenticated;