
CREATE OR REPLACE FUNCTION public.knowledge_search(_q TEXT, _limit INT DEFAULT 5)
RETURNS TABLE (
  id UUID, tipo TEXT, titulo TEXT, resumo TEXT, categoria TEXT,
  sistema_slug TEXT, url_externa TEXT, updated_at TIMESTAMPTZ, relevancia REAL
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('portuguese', coalesce(_q,'')) AS tsq
  )
  SELECT a.id, a.tipo, a.titulo, a.resumo, a.categoria,
         a.sistema_slug, a.url_externa, a.updated_at,
         ts_rank_cd(a.search_tsv, q.tsq)::real AS relevancia
    FROM public.knowledge_articles a, q
   WHERE a.status = 'publicado'
     AND (q.tsq IS NULL OR a.search_tsv @@ q.tsq)
   ORDER BY relevancia DESC NULLS LAST, a.updated_at DESC
   LIMIT GREATEST(1, LEAST(coalesce(_limit,5), 20));
$$;
REVOKE ALL ON FUNCTION public.knowledge_search(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.knowledge_search(TEXT, INT) TO authenticated, service_role;
