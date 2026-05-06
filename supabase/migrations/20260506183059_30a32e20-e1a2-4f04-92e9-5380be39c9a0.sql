DROP POLICY IF EXISTS "Devs can delete tasks" ON public.demanda_tasks;
DROP POLICY IF EXISTS "Devs can insert tasks" ON public.demanda_tasks;
DROP POLICY IF EXISTS "Devs can update tasks" ON public.demanda_tasks;
DROP POLICY IF EXISTS "Devs can view tasks" ON public.demanda_tasks;

CREATE POLICY "Devs can view tasks" ON public.demanda_tasks
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can insert tasks" ON public.demanda_tasks
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can update tasks" ON public.demanda_tasks
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can delete tasks" ON public.demanda_tasks
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP VIEW IF EXISTS public.developers;
CREATE VIEW public.developers
WITH (security_invoker = on) AS
SELECT p.id, p.nome, p.email
FROM public.profiles p
WHERE private.has_role(p.id, 'admin'::app_role);

GRANT SELECT ON public.developers TO authenticated;

DROP POLICY IF EXISTS "Admins can view admin profiles" ON public.profiles;
CREATE POLICY "Admins can view admin profiles" ON public.profiles
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role) AND private.has_role(id, 'admin'::app_role));