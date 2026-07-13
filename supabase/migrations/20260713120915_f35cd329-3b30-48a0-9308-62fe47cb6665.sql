
-- =====================================================================
-- Onda T1: Trello-like evolution for Atividades (additive, idempotent)
-- =====================================================================

-- 1) Novas colunas em atividades_cards
ALTER TABLE public.atividades_cards
  ADD COLUMN IF NOT EXISTS data_entrega timestamptz,
  ADD COLUMN IF NOT EXISTS data_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS concluido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_conclusao timestamptz,
  ADD COLUMN IF NOT EXISTS cover_cor text,
  ADD COLUMN IF NOT EXISTS prioridade text,
  ADD COLUMN IF NOT EXISTS descricao_markdown boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'atividades_cards_prioridade_chk'
  ) THEN
    ALTER TABLE public.atividades_cards
      ADD CONSTRAINT atividades_cards_prioridade_chk
      CHECK (prioridade IS NULL OR prioridade IN ('baixa','media','alta','urgente'));
  END IF;
END $$;

-- 2) Tabela de etiquetas (labels)
CREATE TABLE IF NOT EXISTS public.atividades_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT 'blue',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_labels TO authenticated;
GRANT ALL ON public.atividades_labels TO service_role;
ALTER TABLE public.atividades_labels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_labels' AND policyname='allowed can read labels') THEN
    CREATE POLICY "allowed can read labels" ON public.atividades_labels
      FOR SELECT TO authenticated USING (public.is_allowed_user());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_labels' AND policyname='allowed can insert labels') THEN
    CREATE POLICY "allowed can insert labels" ON public.atividades_labels
      FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_labels' AND policyname='allowed can update labels') THEN
    CREATE POLICY "allowed can update labels" ON public.atividades_labels
      FOR UPDATE TO authenticated USING (public.is_allowed_user()) WITH CHECK (public.is_allowed_user());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_labels' AND policyname='allowed can delete labels') THEN
    CREATE POLICY "allowed can delete labels" ON public.atividades_labels
      FOR DELETE TO authenticated USING (public.is_allowed_user());
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_atividades_labels_updated ON public.atividades_labels;
CREATE TRIGGER trg_atividades_labels_updated
  BEFORE UPDATE ON public.atividades_labels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Vínculo N:N cartão ↔ etiqueta
CREATE TABLE IF NOT EXISTS public.atividades_card_labels (
  card_id uuid NOT NULL REFERENCES public.atividades_cards(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.atividades_labels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, label_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_card_labels TO authenticated;
GRANT ALL ON public.atividades_card_labels TO service_role;
ALTER TABLE public.atividades_card_labels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_card_labels' AND policyname='allowed can read card labels') THEN
    CREATE POLICY "allowed can read card labels" ON public.atividades_card_labels
      FOR SELECT TO authenticated USING (public.is_allowed_user());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_card_labels' AND policyname='allowed can insert card labels') THEN
    CREATE POLICY "allowed can insert card labels" ON public.atividades_card_labels
      FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_card_labels' AND policyname='allowed can delete card labels') THEN
    CREATE POLICY "allowed can delete card labels" ON public.atividades_card_labels
      FOR DELETE TO authenticated USING (public.is_allowed_user());
  END IF;
END $$;

-- 4) Histórico de atividade do cartão
CREATE TABLE IF NOT EXISTS public.atividades_atividade_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.atividades_cards(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  tipo text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atividades_atividade_log_card
  ON public.atividades_atividade_log(card_id, created_at DESC);

GRANT SELECT, INSERT ON public.atividades_atividade_log TO authenticated;
GRANT ALL ON public.atividades_atividade_log TO service_role;
ALTER TABLE public.atividades_atividade_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_atividade_log' AND policyname='allowed can read activity log') THEN
    CREATE POLICY "allowed can read activity log" ON public.atividades_atividade_log
      FOR SELECT TO authenticated USING (public.is_allowed_user());
  END IF;
  -- insert via trigger SECURITY DEFINER; ainda assim liberamos insert autenticado por segurança de fallback
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='atividades_atividade_log' AND policyname='allowed can insert activity log') THEN
    CREATE POLICY "allowed can insert activity log" ON public.atividades_atividade_log
      FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());
  END IF;
END $$;

-- 5) Trigger de log em atividades_cards
CREATE OR REPLACE FUNCTION public.log_atividade_card_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, payload)
      VALUES (NEW.id, v_uid, v_email, 'criado', jsonb_build_object('titulo', NEW.titulo, 'coluna_id', NEW.coluna_id));
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.coluna_id IS DISTINCT FROM OLD.coluna_id THEN
        INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, payload)
        VALUES (NEW.id, v_uid, v_email, 'movido',
          jsonb_build_object('de', OLD.coluna_id, 'para', NEW.coluna_id));
      END IF;
      IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
        INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, payload)
        VALUES (NEW.id, v_uid, v_email, 'renomeado',
          jsonb_build_object('de', OLD.titulo, 'para', NEW.titulo));
      END IF;
      IF NEW.data_entrega IS DISTINCT FROM OLD.data_entrega THEN
        INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, payload)
        VALUES (NEW.id, v_uid, v_email, 'prazo',
          jsonb_build_object('de', OLD.data_entrega, 'para', NEW.data_entrega));
      END IF;
      IF NEW.concluido IS DISTINCT FROM OLD.concluido THEN
        INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, payload)
        VALUES (NEW.id, v_uid, v_email, CASE WHEN NEW.concluido THEN 'concluido' ELSE 'reaberto' END, '{}'::jsonb);
      END IF;
      RETURN NEW;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- nunca bloquear a operação principal por causa do log
    RETURN COALESCE(NEW, OLD);
  END;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_log_atividade_card_change ON public.atividades_cards;
CREATE TRIGGER trg_log_atividade_card_change
  AFTER INSERT OR UPDATE ON public.atividades_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_atividade_card_change();

-- 6) Automação: mover para coluna "concluido" marca card como concluído
CREATE OR REPLACE FUNCTION public.auto_conclude_on_coluna_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chave text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.coluna_id IS DISTINCT FROM OLD.coluna_id THEN
    SELECT chave INTO v_chave FROM public.atividades_colunas WHERE id = NEW.coluna_id;
    IF v_chave = 'concluido' AND NEW.concluido = false THEN
      NEW.concluido := true;
      NEW.data_conclusao := now();
    ELSIF v_chave IS DISTINCT FROM 'concluido' AND NEW.concluido = true AND OLD.concluido = true THEN
      -- reabre se saiu da coluna concluido
      NEW.concluido := false;
      NEW.data_conclusao := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_conclude_on_coluna_change ON public.atividades_cards;
CREATE TRIGGER trg_auto_conclude_on_coluna_change
  BEFORE UPDATE ON public.atividades_cards
  FOR EACH ROW EXECUTE FUNCTION public.auto_conclude_on_coluna_change();

-- 7) Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_cards;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_comentarios;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_labels;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_card_labels;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_atividade_log;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_colunas;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
