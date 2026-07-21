
-- ============ demands: colunas de resposta automática por IA ============
ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS ai_auto_responded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS ai_response_article_id uuid REFERENCES public.knowledge_articles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_response_comment_id uuid;

-- ============ demand_comments: marcação de autor IA ============
ALTER TABLE public.demand_comments
  ADD COLUMN IF NOT EXISTS is_ai boolean NOT NULL DEFAULT false;

ALTER TABLE public.demand_comments
  ALTER COLUMN user_id DROP NOT NULL;

-- Ajusta a política de INSERT para aceitar comentários da IA (user_id nulo + is_ai=true via service_role)
DROP POLICY IF EXISTS "Authenticated insert own comments" ON public.demand_comments;
CREATE POLICY "Authenticated insert own comments"
  ON public.demand_comments FOR INSERT
  TO authenticated
  WITH CHECK (is_ai = false AND auth.uid() = user_id);

-- ============ ticket_deflections ============
CREATE TABLE IF NOT EXISTS public.ticket_deflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  article_id uuid REFERENCES public.knowledge_articles(id) ON DELETE SET NULL,
  query_text text NOT NULL,
  resolved_without_ticket boolean NOT NULL DEFAULT true,
  origin text NOT NULL DEFAULT 'portal',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_deflections_created_at ON public.ticket_deflections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_deflections_user_id ON public.ticket_deflections(user_id);

GRANT SELECT, INSERT ON public.ticket_deflections TO authenticated;
GRANT ALL ON public.ticket_deflections TO service_role;

ALTER TABLE public.ticket_deflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own deflections"
  ON public.ticket_deflections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own deflections"
  ON public.ticket_deflections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all deflections"
  ON public.ticket_deflections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
