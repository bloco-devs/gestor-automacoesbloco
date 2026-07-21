-- =========================
-- WEBHOOKS
-- =========================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  secret text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT ALL ON public.webhooks TO service_role;

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks admin manage"
  ON public.webhooks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  read boolean NOT NULL DEFAULT false,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id) WHERE read = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications owner read"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications owner update"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications owner delete"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Inserts sempre feitos por triggers/edge functions (SECURITY DEFINER / service_role).
-- Nenhuma policy de INSERT para authenticated.

-- =========================
-- TRIGGER: demands -> notifications
-- =========================
CREATE OR REPLACE FUNCTION public.trg_demand_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
BEGIN
  v_link := '/admin/demandas?demand=' || NEW.id::text;

  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> NEW.created_by THEN
      INSERT INTO public.notifications (user_id, title, message, type, link_url)
      VALUES (NEW.assigned_to,
              'Nova demanda atribuída',
              'Você foi designado para: ' || COALESCE(NEW.title, 'Demanda'),
              'assigned',
              v_link);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Nova atribuição (ou troca de responsável)
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       AND NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link_url)
      VALUES (NEW.assigned_to,
              'Demanda atribuída a você',
              'Você foi designado para: ' || COALESCE(NEW.title, 'Demanda'),
              'assigned',
              v_link);
    END IF;

    -- Mudança de status: notifica responsável e criador (se diferentes)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link_url)
        VALUES (NEW.assigned_to,
                'Status da demanda atualizado',
                COALESCE(NEW.title, 'Demanda') || ' agora está em ' || NEW.status::text,
                'status_change',
                v_link);
      END IF;
      IF NEW.created_by IS NOT NULL
         AND NEW.created_by IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.notifications (user_id, title, message, type, link_url)
        VALUES (NEW.created_by,
                'Sua demanda mudou de status',
                COALESCE(NEW.title, 'Demanda') || ' agora está em ' || NEW.status::text,
                'status_change',
                v_link);
      END IF;
    END IF;

    -- SLA estourado
    IF NEW.sla_status IS DISTINCT FROM OLD.sla_status
       AND NEW.sla_status = 'estourado' THEN
      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link_url)
        VALUES (NEW.assigned_to,
                'SLA estourado',
                'A demanda "' || COALESCE(NEW.title, '') || '" ultrapassou o SLA.',
                'sla_alert',
                v_link);
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_demand_notify ON public.demands;
CREATE TRIGGER trg_demand_notify
  AFTER INSERT OR UPDATE ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.trg_demand_notify();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhooks;