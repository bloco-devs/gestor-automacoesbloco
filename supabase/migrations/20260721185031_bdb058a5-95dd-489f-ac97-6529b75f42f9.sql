
-- ===== demand_comments =====
CREATE TABLE public.demand_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demand_comments_demand_id ON public.demand_comments(demand_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_comments TO authenticated;
GRANT ALL ON public.demand_comments TO service_role;

ALTER TABLE public.demand_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read comments"
  ON public.demand_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert own comments"
  ON public.demand_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Author updates own comments"
  ON public.demand_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Author deletes own comments"
  ON public.demand_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_demand_comments_updated_at
  BEFORE UPDATE ON public.demand_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== demand_audit_logs =====
CREATE TABLE public.demand_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demand_audit_demand_id ON public.demand_audit_logs(demand_id, created_at DESC);

GRANT SELECT ON public.demand_audit_logs TO authenticated;
GRANT ALL ON public.demand_audit_logs TO service_role;

ALTER TABLE public.demand_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read audit logs"
  ON public.demand_audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- ===== trigger de auditoria =====
CREATE OR REPLACE FUNCTION public.trg_audit_demand_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.demand_audit_logs(demand_id, user_id, action, field_name, old_value, new_value)
    VALUES (NEW.id, v_uid, 'status_changed', 'status', OLD.status::text, NEW.status::text);
  END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.demand_audit_logs(demand_id, user_id, action, field_name, old_value, new_value)
    VALUES (NEW.id, v_uid, 'priority_changed', 'priority', OLD.priority::text, NEW.priority::text);
  END IF;
  IF NEW.complexity IS DISTINCT FROM OLD.complexity THEN
    INSERT INTO public.demand_audit_logs(demand_id, user_id, action, field_name, old_value, new_value)
    VALUES (NEW.id, v_uid, 'complexity_changed', 'complexity', OLD.complexity::text, NEW.complexity::text);
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.demand_audit_logs(demand_id, user_id, action, field_name, old_value, new_value)
    VALUES (NEW.id, v_uid, 'assigned', 'assigned_to',
            CASE WHEN OLD.assigned_to IS NULL THEN NULL ELSE OLD.assigned_to::text END,
            CASE WHEN NEW.assigned_to IS NULL THEN NULL ELSE NEW.assigned_to::text END);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_demand_changes ON public.demands;
CREATE TRIGGER trg_audit_demand_changes
  AFTER UPDATE ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_demand_changes();

-- ===== realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.demand_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.demand_audit_logs;
