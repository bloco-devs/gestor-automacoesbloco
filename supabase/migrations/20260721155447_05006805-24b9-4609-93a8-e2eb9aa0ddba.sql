
-- Soft delete column
ALTER TABLE public.knowledge_articles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Version history table
CREATE TABLE IF NOT EXISTS public.knowledge_article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid,
  changed_by_email text,
  resumo_alteracao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, versao)
);

GRANT SELECT, INSERT ON public.knowledge_article_versions TO authenticated;
GRANT ALL ON public.knowledge_article_versions TO service_role;

ALTER TABLE public.knowledge_article_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kav_admin_select" ON public.knowledge_article_versions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kav_admin_insert" ON public.knowledge_article_versions
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_kav_article ON public.knowledge_article_versions(article_id, versao DESC);

-- Trigger to snapshot every insert/update
CREATE OR REPLACE FUNCTION public.knowledge_articles_snapshot_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
  v_email text;
BEGIN
  SELECT COALESCE(MAX(versao), 0) + 1 INTO v_next
    FROM public.knowledge_article_versions
   WHERE article_id = NEW.id;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.knowledge_article_versions
    (article_id, versao, snapshot, changed_by, changed_by_email, resumo_alteracao)
  VALUES (
    NEW.id,
    v_next,
    jsonb_build_object(
      'titulo', NEW.titulo,
      'tipo', NEW.tipo,
      'resumo', NEW.resumo,
      'conteudo', NEW.conteudo,
      'categoria', NEW.categoria,
      'sistema_slug', NEW.sistema_slug,
      'tags', NEW.tags,
      'palavras_chave', NEW.palavras_chave,
      'url_externa', NEW.url_externa,
      'status', NEW.status,
      'deleted_at', NEW.deleted_at
    ),
    auth.uid(),
    v_email,
    CASE WHEN TG_OP = 'INSERT' THEN 'Criação' ELSE 'Edição' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_knowledge_articles_snapshot ON public.knowledge_articles;
CREATE TRIGGER trg_knowledge_articles_snapshot
  AFTER INSERT OR UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.knowledge_articles_snapshot_version();

-- Update search to exclude soft-deleted
CREATE OR REPLACE FUNCTION public.knowledge_search(_q text, _limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, tipo text, titulo text, resumo text, categoria text, sistema_slug text, url_externa text, updated_at timestamp with time zone, relevancia real)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT websearch_to_tsquery('portuguese', coalesce(_q,'')) AS tsq
  )
  SELECT a.id, a.tipo, a.titulo, a.resumo, a.categoria,
         a.sistema_slug, a.url_externa, a.updated_at,
         ts_rank_cd(a.search_tsv, q.tsq)::real AS relevancia
    FROM public.knowledge_articles a, q
   WHERE a.status = 'publicado'
     AND a.deleted_at IS NULL
     AND (q.tsq IS NULL OR a.search_tsv @@ q.tsq)
   ORDER BY relevancia DESC NULLS LAST, a.updated_at DESC
   LIMIT GREATEST(1, LEAST(coalesce(_limit,5), 20));
$function$;
