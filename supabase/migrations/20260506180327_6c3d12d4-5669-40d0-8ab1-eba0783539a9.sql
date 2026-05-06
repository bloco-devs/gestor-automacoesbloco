-- Remove single-developer restriction
DROP TRIGGER IF EXISTS enforce_single_developer_role_trg ON public.user_roles;
DROP TRIGGER IF EXISTS sync_single_developer_role_from_profile_trg ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_single_developer_role() CASCADE;
DROP FUNCTION IF EXISTS public.sync_single_developer_role_from_profile() CASCADE;

-- Tasks table
CREATE TABLE public.demanda_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL,
  titulo text NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  assigned_to uuid NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demanda_tasks_solicitacao ON public.demanda_tasks(solicitacao_id);

ALTER TABLE public.demanda_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devs can view tasks" ON public.demanda_tasks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can insert tasks" ON public.demanda_tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can update tasks" ON public.demanda_tasks
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can delete tasks" ON public.demanda_tasks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_demanda_tasks_updated_at
  BEFORE UPDATE ON public.demanda_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Developers view (admins listing for assignment)
CREATE OR REPLACE VIEW public.developers
WITH (security_invoker=on) AS
  SELECT p.id, p.nome, p.email
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'admin'::public.app_role;

GRANT SELECT ON public.developers TO authenticated;

-- Allow admins to read profiles of other admins (so the view returns rows for them)
CREATE POLICY "Admins can view admin profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.has_role(id, 'admin'::app_role)
  );