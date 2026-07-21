
CREATE TABLE public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('artigo','faq','procedimento','video','documento','link')),
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo TEXT,
  url_externa TEXT,
  categoria TEXT,
  sistema_slug TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  palavras_chave TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado','arquivado','rascunho')),
  autor_id UUID,
  autor_email TEXT,
  views INT NOT NULL DEFAULT 0,
  search_tsv TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_articles_search_idx ON public.knowledge_articles USING GIN (search_tsv);
CREATE INDEX knowledge_articles_status_idx ON public.knowledge_articles (status);
CREATE INDEX knowledge_articles_categoria_idx ON public.knowledge_articles (categoria);

GRANT SELECT ON public.knowledge_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_articles_read_published" ON public.knowledge_articles
  FOR SELECT USING (status = 'publicado' OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "knowledge_articles_admin_insert" ON public.knowledge_articles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "knowledge_articles_admin_update" ON public.knowledge_articles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "knowledge_articles_admin_delete" ON public.knowledge_articles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.knowledge_articles_refresh_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.titulo,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.resumo,'')), 'B') ||
    setweight(to_tsvector('portuguese', array_to_string(coalesce(NEW.palavras_chave, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('portuguese', array_to_string(coalesce(NEW.tags, '{}'), ' ')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.conteudo,'')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER knowledge_articles_tsv
  BEFORE INSERT OR UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.knowledge_articles_refresh_tsv();

CREATE TABLE public.knowledge_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE SET NULL,
  demanda_similar_id UUID,
  query_text TEXT,
  resolved BOOLEAN NOT NULL,
  origem TEXT NOT NULL DEFAULT 'portal' CHECK (origem IN ('portal','ai_workspace','outro')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_feedback_resolved_idx ON public.knowledge_feedback (resolved, created_at DESC);
CREATE INDEX knowledge_feedback_article_idx ON public.knowledge_feedback (article_id);

GRANT SELECT, INSERT ON public.knowledge_feedback TO authenticated;
GRANT ALL ON public.knowledge_feedback TO service_role;
ALTER TABLE public.knowledge_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_feedback_insert_self" ON public.knowledge_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "knowledge_feedback_read_self_or_admin" ON public.knowledge_feedback
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- RPC pública para busca de conhecimento (usada pela edge function knowledge-search)
CREATE OR REPLACE FUNCTION public.knowledge_search(_q TEXT, _limit INT DEFAULT 5)
RETURNS TABLE (
  id UUID, tipo TEXT, titulo TEXT, resumo TEXT, categoria TEXT,
  sistema_slug TEXT, url_externa TEXT, updated_at TIMESTAMPTZ, relevancia REAL
)
LANGUAGE sql
STABLE SECURITY DEFINER
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
GRANT EXECUTE ON FUNCTION public.knowledge_search(TEXT, INT) TO anon, authenticated, service_role;

-- Seed inicial (conteúdo genérico — pode ser editado pelo admin)
INSERT INTO public.knowledge_articles (tipo, titulo, resumo, conteudo, categoria, sistema_slug, tags, palavras_chave)
VALUES
  ('faq','Não consigo acessar o sistema',
   'Passos rápidos quando o login falha ou a tela fica em branco.',
   E'1. Confirme se está usando seu e-mail corporativo.\n2. Faça logout e limpe o cache do navegador.\n3. Tente pelo modo anônimo.\n4. Se persistir, redefina sua senha.',
   'Acesso','bloco-id',
   ARRAY['acesso','login'], ARRAY['login','senha','acesso','entrar','logar','autenticacao']),
  ('procedimento','Como redefinir minha senha',
   'Guia passo a passo para trocar sua senha do Bloco ID.',
   E'1. Acesse a tela de login.\n2. Clique em "Esqueci minha senha".\n3. Informe seu e-mail corporativo.\n4. Abra o e-mail recebido e clique no link.\n5. Escolha uma senha nova.',
   'Acesso','bloco-id',
   ARRAY['senha','acesso'], ARRAY['senha','esqueci','redefinir','trocar','recuperar']),
  ('artigo','Como abrir uma solicitação pelo Portal',
   'Descreva sua necessidade em uma frase — a IA cuida do resto.',
   E'No Portal do Solicitante, escreva o problema em suas próprias palavras. A IA vai:\n- entender o pedido;\n- sugerir soluções já existentes;\n- caso necessário, montar a solicitação para você revisar.',
   'Como usar','portal',
   ARRAY['portal','solicitacao'], ARRAY['abrir','pedido','solicitacao','ajuda','como','novo']),
  ('faq','Onde acompanho minhas solicitações',
   'Todas as suas solicitações aparecem em "Minhas Solicitações".',
   'Acesse "Minhas Solicitações" no menu lateral. Você verá o andamento, o responsável e a etapa atual de cada uma.',
   'Acompanhamento','portal',
   ARRAY['acompanhar'], ARRAY['acompanhar','status','andamento','minhas','solicitacoes','pedidos']),
  ('procedimento','Como anexar arquivos à minha solicitação',
   'Adicione prints, planilhas e documentos para agilizar o atendimento.',
   E'Abra a solicitação em "Minhas Solicitações", clique em "Anexar" e selecione seus arquivos. Formatos suportados: PDF, imagens, planilhas, documentos.',
   'Como usar','portal',
   ARRAY['anexo','arquivo'], ARRAY['anexar','arquivo','documento','print','imagem','upload']);
