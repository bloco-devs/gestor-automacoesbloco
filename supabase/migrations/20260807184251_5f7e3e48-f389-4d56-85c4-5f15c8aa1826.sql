ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS ordem_manual integer;
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS ordem_manual integer;
CREATE INDEX IF NOT EXISTS demands_ordem_manual_idx ON public.demands (status, ordem_manual NULLS LAST);
CREATE INDEX IF NOT EXISTS solicitacoes_ordem_manual_idx ON public.solicitacoes (ordem_manual NULLS LAST);