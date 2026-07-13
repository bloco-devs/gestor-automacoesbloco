
-- =====================================================================
-- Consolidação técnica módulo Atividades — Bloco A (aditivo/idempotente)
-- =====================================================================

-- 1) LIMPEZA DE ÓRFÃOS (antes das FKs) --------------------------------
DELETE FROM public.atividades_card_labels cl
 WHERE NOT EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = cl.card_id)
    OR NOT EXISTS (SELECT 1 FROM public.atividades_labels l WHERE l.id = cl.label_id);

DELETE FROM public.atividades_atividade_log log
 WHERE NOT EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = log.card_id);

DELETE FROM public.atividades_comentarios cm
 WHERE NOT EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = cm.card_id);

-- 2) MULTI-BOARD (estrutura, sem mudança de UX) ----------------------
CREATE TABLE IF NOT EXISTS public.atividades_boards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  nome       text NOT NULL,
  ordem      int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.atividades_boards TO authenticated;
GRANT ALL    ON public.atividades_boards TO service_role;

ALTER TABLE public.atividades_boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read boards"   ON public.atividades_boards;
DROP POLICY IF EXISTS "Admins can manage boards" ON public.atividades_boards;
CREATE POLICY "Admins can read boards" ON public.atividades_boards
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage boards" ON public.atividades_boards
  FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_boards_updated_at ON public.atividades_boards;
CREATE TRIGGER trg_boards_updated_at BEFORE UPDATE ON public.atividades_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.atividades_boards (slug, nome, ordem)
VALUES ('default', 'Atividades', 0)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.atividades_colunas ADD COLUMN IF NOT EXISTS board_id uuid;
ALTER TABLE public.atividades_cards   ADD COLUMN IF NOT EXISTS board_id uuid;
ALTER TABLE public.atividades_labels  ADD COLUMN IF NOT EXISTS board_id uuid;

UPDATE public.atividades_colunas
   SET board_id = (SELECT id FROM public.atividades_boards WHERE slug='default')
 WHERE board_id IS NULL;
UPDATE public.atividades_cards
   SET board_id = (SELECT id FROM public.atividades_boards WHERE slug='default')
 WHERE board_id IS NULL;
UPDATE public.atividades_labels
   SET board_id = (SELECT id FROM public.atividades_boards WHERE slug='default')
 WHERE board_id IS NULL;

ALTER TABLE public.atividades_colunas ALTER COLUMN board_id SET NOT NULL;
ALTER TABLE public.atividades_cards   ALTER COLUMN board_id SET NOT NULL;
ALTER TABLE public.atividades_labels  ALTER COLUMN board_id SET NOT NULL;

-- 3) FOREIGN KEYS -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='atividades_colunas_board_id_fkey') THEN
    ALTER TABLE public.atividades_colunas
      ADD CONSTRAINT atividades_colunas_board_id_fkey
      FOREIGN KEY (board_id) REFERENCES public.atividades_boards(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='atividades_cards_board_id_fkey') THEN
    ALTER TABLE public.atividades_cards
      ADD CONSTRAINT atividades_cards_board_id_fkey
      FOREIGN KEY (board_id) REFERENCES public.atividades_boards(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='atividades_labels_board_id_fkey') THEN
    ALTER TABLE public.atividades_labels
      ADD CONSTRAINT atividades_labels_board_id_fkey
      FOREIGN KEY (board_id) REFERENCES public.atividades_boards(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='atividades_cards_coluna_id_fkey') THEN
    ALTER TABLE public.atividades_cards
      ADD CONSTRAINT atividades_cards_coluna_id_fkey
      FOREIGN KEY (coluna_id) REFERENCES public.atividades_colunas(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='atividades_card_labels_card_id_fkey') THEN
    ALTER TABLE public.atividades_card_labels
      ADD CONSTRAINT atividades_card_labels_card_id_fkey
      FOREIGN KEY (card_id) REFERENCES public.atividades_cards(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='atividades_card_labels_label_id_fkey') THEN
    ALTER TABLE public.atividades_card_labels
      ADD CONSTRAINT atividades_card_labels_label_id_fkey
      FOREIGN KEY (label_id) REFERENCES public.atividades_labels(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='atividades_atividade_log_card_id_fkey') THEN
    ALTER TABLE public.atividades_atividade_log
      ADD CONSTRAINT atividades_atividade_log_card_id_fkey
      FOREIGN KEY (card_id) REFERENCES public.atividades_cards(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='atividades_comentarios_card_id_fkey') THEN
    ALTER TABLE public.atividades_comentarios
      ADD CONSTRAINT atividades_comentarios_card_id_fkey
      FOREIGN KEY (card_id) REFERENCES public.atividades_cards(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4) ÍNDICES ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_atividades_cards_responsavel_id
  ON public.atividades_cards (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_atividades_cards_responsavel_ids_gin
  ON public.atividades_cards USING GIN (responsavel_ids);
CREATE INDEX IF NOT EXISTS idx_atividades_cards_responsavel_persona_ids_gin
  ON public.atividades_cards USING GIN (responsavel_persona_ids);
CREATE INDEX IF NOT EXISTS idx_atividades_cards_data_entrega
  ON public.atividades_cards (data_entrega);
CREATE INDEX IF NOT EXISTS idx_atividades_cards_solucao_id
  ON public.atividades_cards (solucao_id);
CREATE INDEX IF NOT EXISTS idx_atividades_cards_created_by
  ON public.atividades_cards (created_by);
CREATE INDEX IF NOT EXISTS idx_atividades_cards_board_coluna_ordem
  ON public.atividades_cards (board_id, coluna_id, ordem);
CREATE INDEX IF NOT EXISTS idx_atividades_colunas_board_ordem
  ON public.atividades_colunas (board_id, ordem);
CREATE INDEX IF NOT EXISTS idx_atividades_labels_board
  ON public.atividades_labels (board_id);
CREATE INDEX IF NOT EXISTS idx_atividades_card_labels_label_id
  ON public.atividades_card_labels (label_id);
CREATE INDEX IF NOT EXISTS idx_atividades_atividade_log_user
  ON public.atividades_atividade_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_atividades_comentarios_user_id
  ON public.atividades_comentarios (user_id);

-- 5) RLS — fechar vazamentos via tabelas auxiliares ------------------
DROP POLICY IF EXISTS "allowed can read activity log"   ON public.atividades_atividade_log;
DROP POLICY IF EXISTS "allowed can insert activity log" ON public.atividades_atividade_log;
DROP POLICY IF EXISTS "Admins can read activity log"    ON public.atividades_atividade_log;
DROP POLICY IF EXISTS "Block direct insert on activity log" ON public.atividades_atividade_log;
CREATE POLICY "Admins can read activity log"
  ON public.atividades_atividade_log FOR SELECT
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Block direct insert on activity log"
  ON public.atividades_atividade_log FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "allowed can read card labels"   ON public.atividades_card_labels;
DROP POLICY IF EXISTS "allowed can insert card labels" ON public.atividades_card_labels;
DROP POLICY IF EXISTS "allowed can delete card labels" ON public.atividades_card_labels;
DROP POLICY IF EXISTS "Admins can read card labels"    ON public.atividades_card_labels;
DROP POLICY IF EXISTS "Admins can insert card labels"  ON public.atividades_card_labels;
DROP POLICY IF EXISTS "Admins can delete card labels"  ON public.atividades_card_labels;
CREATE POLICY "Admins can read card labels"
  ON public.atividades_card_labels FOR SELECT
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert card labels"
  ON public.atividades_card_labels FOR INSERT
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = card_id)
    AND EXISTS (SELECT 1 FROM public.atividades_labels l WHERE l.id = label_id)
  );
CREATE POLICY "Admins can delete card labels"
  ON public.atividades_card_labels FOR DELETE
  USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "allowed can read labels"   ON public.atividades_labels;
DROP POLICY IF EXISTS "allowed can insert labels" ON public.atividades_labels;
DROP POLICY IF EXISTS "allowed can update labels" ON public.atividades_labels;
DROP POLICY IF EXISTS "allowed can delete labels" ON public.atividades_labels;
DROP POLICY IF EXISTS "Admins can read labels"    ON public.atividades_labels;
DROP POLICY IF EXISTS "Admins can insert labels"  ON public.atividades_labels;
DROP POLICY IF EXISTS "Admins can update labels"  ON public.atividades_labels;
DROP POLICY IF EXISTS "Admins can delete labels"  ON public.atividades_labels;
CREATE POLICY "Admins can read labels"
  ON public.atividades_labels FOR SELECT
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert labels"
  ON public.atividades_labels FOR INSERT
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update labels"
  ON public.atividades_labels FOR UPDATE
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete labels"
  ON public.atividades_labels FOR DELETE
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 6) ACTIVITY LOG — coluna entity para timeline estruturada ----------
ALTER TABLE public.atividades_atividade_log
  ADD COLUMN IF NOT EXISTS entity text NOT NULL DEFAULT 'card';

CREATE INDEX IF NOT EXISTS idx_atividades_atividade_log_entity
  ON public.atividades_atividade_log (entity, created_at DESC);

-- 7) TRIGGER de log — ignora UPDATE que só mexe em `ordem` -----------
CREATE OR REPLACE FUNCTION public.log_atividade_card_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
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
      INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, entity, payload)
      VALUES (NEW.id, v_uid, v_email, 'criado', 'card',
        jsonb_build_object('titulo', NEW.titulo, 'coluna_id', NEW.coluna_id));
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Ignora reorder puro (só mudou `ordem`) para não poluir o log.
      IF NEW.coluna_id      IS NOT DISTINCT FROM OLD.coluna_id
         AND NEW.titulo     IS NOT DISTINCT FROM OLD.titulo
         AND NEW.data_entrega IS NOT DISTINCT FROM OLD.data_entrega
         AND NEW.concluido  IS NOT DISTINCT FROM OLD.concluido
         AND NEW.ordem      IS DISTINCT FROM OLD.ordem THEN
        RETURN NEW;
      END IF;

      IF NEW.coluna_id IS DISTINCT FROM OLD.coluna_id THEN
        INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, entity, payload)
        VALUES (NEW.id, v_uid, v_email, 'movido', 'card',
          jsonb_build_object('de', OLD.coluna_id, 'para', NEW.coluna_id));
      END IF;
      IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
        INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, entity, payload)
        VALUES (NEW.id, v_uid, v_email, 'renomeado', 'card',
          jsonb_build_object('de', OLD.titulo, 'para', NEW.titulo));
      END IF;
      IF NEW.data_entrega IS DISTINCT FROM OLD.data_entrega THEN
        INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, entity, payload)
        VALUES (NEW.id, v_uid, v_email, 'prazo', 'card',
          jsonb_build_object('de', OLD.data_entrega, 'para', NEW.data_entrega));
      END IF;
      IF NEW.concluido IS DISTINCT FROM OLD.concluido THEN
        INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, entity, payload)
        VALUES (NEW.id, v_uid, v_email,
          CASE WHEN NEW.concluido THEN 'concluido' ELSE 'reaberto' END, 'card', '{}'::jsonb);
      END IF;
      RETURN NEW;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN COALESCE(NEW, OLD);
  END;
  RETURN COALESCE(NEW, OLD);
END $function$;

-- 8) RPC bulk reorder (hardened) -------------------------------------
CREATE OR REPLACE FUNCTION public.atividades_reorder_cards(items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_expected  int;
  v_valid     int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT private.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a jsonb array' USING ERRCODE = '22023';
  END IF;

  CREATE TEMP TABLE _reorder ON COMMIT DROP AS
  SELECT id, coluna_id, ordem
    FROM jsonb_to_recordset(items) AS x(id uuid, coluna_id uuid, ordem int);

  SELECT count(*) INTO v_expected
    FROM _reorder
   WHERE id IS NOT NULL AND coluna_id IS NOT NULL AND ordem IS NOT NULL;
  IF v_expected = 0 THEN
    RETURN;
  END IF;

  -- Todos os cards existem
  SELECT count(*) INTO v_valid
    FROM _reorder r
    JOIN public.atividades_cards c ON c.id = r.id;
  IF v_valid <> v_expected THEN
    RAISE EXCEPTION 'invalid card ids in payload' USING ERRCODE = '22023';
  END IF;

  -- Todas as colunas destino existem
  SELECT count(*) INTO v_valid
    FROM (SELECT DISTINCT coluna_id FROM _reorder) d
    JOIN public.atividades_colunas col ON col.id = d.coluna_id;
  IF v_valid <> (SELECT count(DISTINCT coluna_id) FROM _reorder) THEN
    RAISE EXCEPTION 'invalid column ids in payload' USING ERRCODE = '22023';
  END IF;

  -- Todos os cards e colunas pertencem ao mesmo board (escopo)
  IF (SELECT count(DISTINCT c.board_id)
        FROM _reorder r JOIN public.atividades_cards c ON c.id = r.id) > 1
     OR EXISTS (
       SELECT 1
         FROM _reorder r
         JOIN public.atividades_cards   c   ON c.id = r.id
         JOIN public.atividades_colunas col ON col.id = r.coluna_id
        WHERE c.board_id <> col.board_id
     ) THEN
    RAISE EXCEPTION 'cards and columns must belong to the same board' USING ERRCODE = '22023';
  END IF;

  UPDATE public.atividades_cards c
     SET coluna_id = r.coluna_id,
         ordem     = r.ordem
    FROM _reorder r
   WHERE c.id = r.id
     AND (c.coluna_id IS DISTINCT FROM r.coluna_id OR c.ordem IS DISTINCT FROM r.ordem);
END $function$;

REVOKE ALL      ON FUNCTION public.atividades_reorder_cards(jsonb) FROM PUBLIC;
GRANT  EXECUTE  ON FUNCTION public.atividades_reorder_cards(jsonb) TO authenticated;

-- 9) LIMPEZA de campos ociosos ---------------------------------------
ALTER TABLE public.atividades_cards DROP COLUMN IF EXISTS data_inicio;
ALTER TABLE public.atividades_cards DROP COLUMN IF EXISTS descricao_markdown;
