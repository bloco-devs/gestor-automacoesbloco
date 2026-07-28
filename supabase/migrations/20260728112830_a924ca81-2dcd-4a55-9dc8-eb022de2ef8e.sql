CREATE OR REPLACE FUNCTION public.is_equipe()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() IN ('developer', 'administrador');
$$;

GRANT EXECUTE ON FUNCTION public.is_equipe() TO authenticated;

DROP POLICY IF EXISTS "demands_update_own_or_admin" ON public.demands;

CREATE POLICY "demands_update_own_or_equipe" ON public.demands
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR public.is_equipe()
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR public.is_equipe()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);