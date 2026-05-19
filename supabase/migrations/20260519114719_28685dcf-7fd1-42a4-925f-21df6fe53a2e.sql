
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS avaliado_por uuid,
  ADD COLUMN IF NOT EXISTS avaliado_em timestamptz;

-- Backfill from score history (last change)
UPDATE public.solicitacoes s
SET avaliado_por = h.changed_by,
    avaliado_em = h.changed_at
FROM (
  SELECT DISTINCT ON (solicitacao_id) solicitacao_id, changed_by, changed_at
  FROM public.solicitacoes_score_history
  ORDER BY solicitacao_id, changed_at DESC
) h
WHERE h.solicitacao_id = s.id
  AND s.complexidade_dev IS NOT NULL
  AND s.avaliado_por IS NULL;

-- Protect avaliado_por / avaliado_em (dev/admin only). Also auto-fill on dev changes.
CREATE OR REPLACE FUNCTION public.enforce_dev_only_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.complexidade_dev := OLD.complexidade_dev;
    NEW.notas_tecnicas_complexidade := OLD.notas_tecnicas_complexidade;
    NEW.avaliado_por := OLD.avaliado_por;
    NEW.avaliado_em := OLD.avaliado_em;
  ELSE
    -- Auto-stamp evaluator when dev fields change
    IF NEW.complexidade_dev IS DISTINCT FROM OLD.complexidade_dev
       OR NEW.notas_tecnicas_complexidade IS DISTINCT FROM OLD.notas_tecnicas_complexidade THEN
      NEW.avaliado_por := auth.uid();
      NEW.avaliado_em := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
