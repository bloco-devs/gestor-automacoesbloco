
-- ============================================================
-- A) Score autoritativo no servidor
-- ============================================================

ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS score_solicitante numeric,
  ADD COLUMN IF NOT EXISTS score_final numeric;

CREATE OR REPLACE FUNCTION public.compute_scores()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  f numeric := GREATEST(0, LEAST(10, COALESCE(NEW.frequencia, 0)));
  d numeric := GREATEST(0, LEAST(10, COALESCE(NEW.complexidade, 0)));
  r numeric := GREATEST(0, LEAST(10, COALESCE(NEW.retorno, 0)));
  s numeric;
  cd numeric;
BEGIN
  s := ((f + d + r) / 30.0) * 100.0;
  NEW.score_solicitante := s;
  NEW.score := round(s)::int;
  IF NEW.complexidade_dev IS NULL THEN
    NEW.score_final := NULL;
  ELSE
    cd := GREATEST(0, LEAST(10, NEW.complexidade_dev));
    NEW.score_final := s * ((10.0 - cd) / 10.0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_scores ON public.solicitacoes;
CREATE TRIGGER trg_compute_scores
  BEFORE INSERT OR UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.compute_scores();

-- Backfill: força recálculo em todas as linhas (dispara o BEFORE UPDATE).
UPDATE public.solicitacoes SET updated_at = updated_at;

-- ============================================================
-- B) Endurecer campos técnicos no UPDATE de solicitacoes
--    (estende enforce_dev_only_columns para também bloquear status
--     e quaisquer tentativas de cliente de gravar score/score_*)
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_dev_only_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.complexidade_dev := OLD.complexidade_dev;
    NEW.notas_tecnicas_complexidade := OLD.notas_tecnicas_complexidade;
    NEW.avaliado_por := OLD.avaliado_por;
    NEW.avaliado_em := OLD.avaliado_em;
    -- Solicitante não pode mudar status (avanço do pipeline é do dev).
    NEW.status := OLD.status;
  ELSE
    IF NEW.complexidade_dev IS DISTINCT FROM OLD.complexidade_dev
       OR NEW.notas_tecnicas_complexidade IS DISTINCT FROM OLD.notas_tecnicas_complexidade THEN
      NEW.avaliado_por := auth.uid();
      NEW.avaliado_em := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- C) RLS de bloco_connect_recursos
--    (acesso exclusivamente via edge function com service_role;
--     nenhum cliente autenticado deve ler/escrever direto)
-- ============================================================

ALTER TABLE public.bloco_connect_recursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view bloco_connect_recursos" ON public.bloco_connect_recursos;
CREATE POLICY "Admins can view bloco_connect_recursos"
  ON public.bloco_connect_recursos
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
