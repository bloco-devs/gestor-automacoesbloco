DROP POLICY IF EXISTS knowledge_articles_read_published ON public.knowledge_articles;

CREATE POLICY knowledge_articles_read_published
ON public.knowledge_articles
FOR SELECT
TO authenticated
USING (
  (status = 'publicado'::text AND public.is_allowed_user())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

REVOKE SELECT ON public.knowledge_articles FROM anon;