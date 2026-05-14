-- 1. Guard trigger: only admins can change dev-only columns
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_dev_only_columns ON public.solicitacoes;
CREATE TRIGGER trg_enforce_dev_only_columns
BEFORE UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_dev_only_columns();

-- 2. History table for technical evaluation changes
CREATE TABLE IF NOT EXISTS public.solicitacoes_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  old_complexidade_dev smallint,
  new_complexidade_dev smallint,
  old_notas text,
  new_notas text,
  changed_by uuid,
  changed_by_email text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  trigger_source text NOT NULL DEFAULT 'edit_dev'
);

CREATE INDEX IF NOT EXISTS idx_score_history_solicitacao
  ON public.solicitacoes_score_history(solicitacao_id, changed_at DESC);

ALTER TABLE public.solicitacoes_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all score history" ON public.solicitacoes_score_history;
CREATE POLICY "Admins can view all score history"
ON public.solicitacoes_score_history
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners can view own score history" ON public.solicitacoes_score_history;
CREATE POLICY "Owners can view own score history"
ON public.solicitacoes_score_history
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.solicitacoes s
  WHERE s.id = solicitacoes_score_history.solicitacao_id
    AND s.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins can manage score history" ON public.solicitacoes_score_history;
CREATE POLICY "Admins can manage score history"
ON public.solicitacoes_score_history
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- 3. AFTER UPDATE trigger to log technical-evaluation changes
CREATE OR REPLACE FUNCTION public.log_score_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.complexidade_dev IS DISTINCT FROM OLD.complexidade_dev
     OR NEW.notas_tecnicas_complexidade IS DISTINCT FROM OLD.notas_tecnicas_complexidade THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.solicitacoes_score_history (
      solicitacao_id,
      old_complexidade_dev, new_complexidade_dev,
      old_notas, new_notas,
      changed_by, changed_by_email,
      trigger_source
    ) VALUES (
      NEW.id,
      OLD.complexidade_dev, NEW.complexidade_dev,
      OLD.notas_tecnicas_complexidade, NEW.notas_tecnicas_complexidade,
      auth.uid(), v_email,
      'edit_dev'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_score_history ON public.solicitacoes;
CREATE TRIGGER trg_log_score_history
AFTER UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.log_score_history();