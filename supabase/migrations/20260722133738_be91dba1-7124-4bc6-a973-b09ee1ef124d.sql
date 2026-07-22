
-- =========================
-- workflow_definitions
-- =========================
CREATE TABLE public.workflow_definitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  enabled      boolean NOT NULL DEFAULT true,
  priority     integer NOT NULL DEFAULT 50,
  trigger      text NOT NULL,
  definition   jsonb NOT NULL DEFAULT '{}'::jsonb,
  version      integer NOT NULL DEFAULT 1,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX workflow_definitions_trigger_idx  ON public.workflow_definitions(trigger)  WHERE deleted_at IS NULL;
CREATE INDEX workflow_definitions_enabled_idx  ON public.workflow_definitions(enabled)  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_definitions TO authenticated;
GRANT ALL ON public.workflow_definitions TO service_role;

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_definitions read (allowed users)"
  ON public.workflow_definitions FOR SELECT TO authenticated
  USING (public.is_allowed_user());

CREATE POLICY "workflow_definitions admin insert"
  ON public.workflow_definitions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "workflow_definitions admin update"
  ON public.workflow_definitions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "workflow_definitions admin delete"
  ON public.workflow_definitions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- version bump + updated_at + updated_by on UPDATE
CREATE OR REPLACE FUNCTION public.workflow_definitions_bump()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  IF TG_OP = 'UPDATE' AND (
    NEW.name IS DISTINCT FROM OLD.name
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.enabled IS DISTINCT FROM OLD.enabled
    OR NEW.priority IS DISTINCT FROM OLD.priority
    OR NEW.trigger IS DISTINCT FROM OLD.trigger
    OR NEW.definition IS DISTINCT FROM OLD.definition
  ) THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_workflow_definitions_bump
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.workflow_definitions_bump();

-- =========================
-- workflow_execution_logs
-- =========================
CREATE TABLE public.workflow_execution_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id       uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  demand_id         uuid REFERENCES public.demands(id) ON DELETE SET NULL,
  status            text NOT NULL,
  duration_ms       integer NOT NULL DEFAULT 0,
  execution_result  jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workflow_execution_logs_workflow_idx ON public.workflow_execution_logs(workflow_id, created_at DESC);
CREATE INDEX workflow_execution_logs_demand_idx   ON public.workflow_execution_logs(demand_id, created_at DESC);
CREATE INDEX workflow_execution_logs_created_idx  ON public.workflow_execution_logs(created_at DESC);

GRANT SELECT, INSERT ON public.workflow_execution_logs TO authenticated;
GRANT ALL ON public.workflow_execution_logs TO service_role;

ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_execution_logs read (allowed users)"
  ON public.workflow_execution_logs FOR SELECT TO authenticated
  USING (public.is_allowed_user());

CREATE POLICY "workflow_execution_logs insert (authenticated allowed)"
  ON public.workflow_execution_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_allowed_user() AND (actor_id IS NULL OR actor_id = auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_execution_logs;
