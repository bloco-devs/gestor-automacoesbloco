
-- 1. Ajustes em demand_comments
ALTER TABLE public.demand_comments
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.demand_comments
  ADD COLUMN IF NOT EXISTS is_ai boolean NOT NULL DEFAULT false;

-- 2. Novas colunas em demands
ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS ai_auto_responded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS ai_response_article_id uuid REFERENCES public.knowledge_articles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_response_comment_id uuid REFERENCES public.demand_comments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_demands_ai_auto_responded
  ON public.demands (ai_auto_responded)
  WHERE ai_auto_responded = true;

-- 3. Nova tabela ticket_deflections
CREATE TABLE IF NOT EXISTS public.ticket_deflections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid REFERENCES public.knowledge_articles(id) ON DELETE SET NULL,
  query_text text NOT NULL,
  resolved_without_ticket boolean NOT NULL DEFAULT true,
  origin text NOT NULL DEFAULT 'portal',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_deflections_created_at
  ON public.ticket_deflections (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_deflections_user
  ON public.ticket_deflections (user_id);

GRANT SELECT, INSERT ON public.ticket_deflections TO authenticated;
GRANT ALL ON public.ticket_deflections TO service_role;

ALTER TABLE public.ticket_deflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_insert_deflection"
  ON public.ticket_deflections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_select_deflection"
  ON public.ticket_deflections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin_select_deflection"
  ON public.ticket_deflections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
