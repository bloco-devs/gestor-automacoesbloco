-- Enums
DO $$ BEGIN
  CREATE TYPE public.demand_status AS ENUM ('backlog','a_fazer','em_desenvolvimento','em_testes','homologacao','concluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.demand_priority AS ENUM ('baixa','media','alta','critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.demand_type AS ENUM ('bug','melhoria','nova_funcionalidade','refatoracao','infraestrutura','automacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.demand_complexity AS ENUM ('facil','media','dificil');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela demands
CREATE TABLE IF NOT EXISTS public.demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  system_id uuid,
  status public.demand_status NOT NULL DEFAULT 'backlog',
  priority public.demand_priority NOT NULL DEFAULT 'media',
  type public.demand_type NOT NULL DEFAULT 'melhoria',
  complexity public.demand_complexity NOT NULL DEFAULT 'media',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demands TO authenticated;
GRANT ALL ON public.demands TO service_role;

ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demands_select_all_authenticated" ON public.demands
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "demands_insert_authenticated" ON public.demands
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "demands_update_own_or_admin" ON public.demands
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "demands_delete_own_or_admin" ON public.demands
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER demands_set_updated_at
  BEFORE UPDATE ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS demands_status_idx ON public.demands (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS demands_created_by_idx ON public.demands (created_by);
CREATE INDEX IF NOT EXISTS demands_assigned_to_idx ON public.demands (assigned_to);

-- Tabela demand_attachments
CREATE TABLE IF NOT EXISTS public.demand_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text,
  file_name text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_attachments TO authenticated;
GRANT ALL ON public.demand_attachments TO service_role;

ALTER TABLE public.demand_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demand_attachments_select" ON public.demand_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.demands d
    WHERE d.id = demand_id
      AND (d.deleted_at IS NULL OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "demand_attachments_insert" ON public.demand_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id AND d.deleted_at IS NULL
    )
  );

CREATE POLICY "demand_attachments_delete" ON public.demand_attachments
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id AND d.created_by = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS demand_attachments_demand_idx ON public.demand_attachments (demand_id);