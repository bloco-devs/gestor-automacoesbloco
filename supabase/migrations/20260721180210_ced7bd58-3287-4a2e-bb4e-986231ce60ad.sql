
-- Enum SLA status
DO $$ BEGIN
  CREATE TYPE public.demand_sla_status AS ENUM ('no_prazo','atencao','estourado','pausado','cumprido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de políticas
CREATE TABLE IF NOT EXISTS public.sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority public.demand_priority NOT NULL UNIQUE,
  resolution_time_hours INTEGER NOT NULL CHECK (resolution_time_hours > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sla_policies TO authenticated;
GRANT ALL ON public.sla_policies TO service_role;

ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sla_policies read auth" ON public.sla_policies;
CREATE POLICY "sla_policies read auth" ON public.sla_policies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sla_policies admin manage" ON public.sla_policies;
CREATE POLICY "sla_policies admin manage" ON public.sla_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_sla_policies_updated ON public.sla_policies;
CREATE TRIGGER trg_sla_policies_updated BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed padrão
INSERT INTO public.sla_policies (priority, resolution_time_hours) VALUES
  ('critica', 2),
  ('alta', 8),
  ('media', 24),
  ('baixa', 48)
ON CONFLICT (priority) DO NOTHING;

-- Colunas em demands
ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_status public.demand_sla_status NOT NULL DEFAULT 'no_prazo';

-- Função para setar sla_due_at
CREATE OR REPLACE FUNCTION public.set_demand_sla()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.sla_due_at IS NULL THEN
      SELECT resolution_time_hours INTO v_hours
        FROM public.sla_policies WHERE priority = NEW.priority;
      IF v_hours IS NOT NULL THEN
        NEW.sla_due_at := COALESCE(NEW.created_at, now()) + make_interval(hours => v_hours);
      END IF;
    END IF;
    IF NEW.sla_status IS NULL THEN
      NEW.sla_status := 'no_prazo';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ao concluir, marcar como cumprido
    IF NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM 'concluido' THEN
      NEW.sla_status := 'cumprido';
    END IF;
    -- Se prioridade mudou e ainda não há sla_due_at manual, recalcular
    IF NEW.priority IS DISTINCT FROM OLD.priority AND NEW.sla_due_at = OLD.sla_due_at THEN
      SELECT resolution_time_hours INTO v_hours
        FROM public.sla_policies WHERE priority = NEW.priority;
      IF v_hours IS NOT NULL THEN
        NEW.sla_due_at := COALESCE(NEW.created_at, now()) + make_interval(hours => v_hours);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_demand_sla ON public.demands;
CREATE TRIGGER trg_set_demand_sla
  BEFORE INSERT OR UPDATE ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.set_demand_sla();

-- Backfill de demandas existentes
UPDATE public.demands d
   SET sla_due_at = d.created_at + make_interval(hours => p.resolution_time_hours)
  FROM public.sla_policies p
 WHERE d.priority = p.priority
   AND d.sla_due_at IS NULL;

UPDATE public.demands
   SET sla_status = 'cumprido'
 WHERE status = 'concluido' AND sla_status <> 'cumprido';
