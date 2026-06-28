ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS match_sugestoes jsonb,
  ADD COLUMN IF NOT EXISTS match_atualizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS desfecho text,
  ADD COLUMN IF NOT EXISTS atendida_por_sistema_slug text,
  ADD COLUMN IF NOT EXISTS atendida_url text,
  ADD COLUMN IF NOT EXISTS atendida_em timestamptz,
  ADD COLUMN IF NOT EXISTS atendida_por uuid,
  ADD COLUMN IF NOT EXISTS consolidada_em uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'solicitacoes_desfecho_check'
  ) THEN
    ALTER TABLE public.solicitacoes
      ADD CONSTRAINT solicitacoes_desfecho_check
      CHECK (desfecho IS NULL OR desfecho IN ('atendida_existente','consolidada'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'solicitacoes_consolidada_em_fkey'
  ) THEN
    ALTER TABLE public.solicitacoes
      ADD CONSTRAINT solicitacoes_consolidada_em_fkey
      FOREIGN KEY (consolidada_em) REFERENCES public.solicitacoes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS solicitacoes_desfecho_idx ON public.solicitacoes(desfecho);