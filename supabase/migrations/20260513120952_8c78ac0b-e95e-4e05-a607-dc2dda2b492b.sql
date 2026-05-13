
CREATE TABLE public.solucao_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solucao_id uuid NOT NULL,
  titulo text NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  assigned_to uuid,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.solucao_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devs can view solucao tasks" ON public.solucao_tasks
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can insert solucao tasks" ON public.solucao_tasks
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can update solucao tasks" ON public.solucao_tasks
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can delete solucao tasks" ON public.solucao_tasks
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_solucao_tasks_updated_at
  BEFORE UPDATE ON public.solucao_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX solucao_tasks_solucao_id_idx ON public.solucao_tasks(solucao_id);
