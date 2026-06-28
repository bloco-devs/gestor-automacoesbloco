
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS tipo_demanda text,
  ADD COLUMN IF NOT EXISTS sistema_alvo_slug text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'solicitacoes_tipo_demanda_check'
  ) THEN
    ALTER TABLE public.solicitacoes
      ADD CONSTRAINT solicitacoes_tipo_demanda_check
      CHECK (tipo_demanda IS NULL OR tipo_demanda IN ('ajuste_existente','novo_modulo','novo_sistema'));
  END IF;
END$$;
