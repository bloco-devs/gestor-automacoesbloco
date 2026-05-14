ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS complexidade_dev smallint NULL;

ALTER TABLE public.solicitacoes
  DROP CONSTRAINT IF EXISTS solicitacoes_complexidade_dev_range;

ALTER TABLE public.solicitacoes
  ADD CONSTRAINT solicitacoes_complexidade_dev_range
  CHECK (complexidade_dev IS NULL OR (complexidade_dev BETWEEN 0 AND 10));