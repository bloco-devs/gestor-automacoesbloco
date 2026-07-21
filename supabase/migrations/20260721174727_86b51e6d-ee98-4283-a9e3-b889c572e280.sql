
-- demand_tasks: subtarefas/checklist para demandas do módulo demands
CREATE TABLE public.demand_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX demand_tasks_demand_idx ON public.demand_tasks(demand_id, order_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_tasks TO authenticated;
GRANT ALL ON public.demand_tasks TO service_role;

ALTER TABLE public.demand_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read demand tasks"
  ON public.demand_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.demands d
             WHERE d.id = demand_id AND d.deleted_at IS NULL)
  );

CREATE POLICY "Authenticated can insert demand tasks"
  ON public.demand_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.demands d
             WHERE d.id = demand_id AND d.deleted_at IS NULL)
  );

CREATE POLICY "Authenticated can update demand tasks"
  ON public.demand_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.demands d
             WHERE d.id = demand_id AND d.deleted_at IS NULL)
  );

CREATE POLICY "Authenticated can delete demand tasks"
  ON public.demand_tasks FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.demands d
             WHERE d.id = demand_id AND d.deleted_at IS NULL)
  );

CREATE TRIGGER update_demand_tasks_updated_at
  BEFORE UPDATE ON public.demand_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
