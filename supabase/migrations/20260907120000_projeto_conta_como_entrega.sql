-- ===========================================================================
-- O PROJETO CONTA COMO ENTREGA
-- ===========================================================================
--
-- O QUE FOI PEDIDO
--
-- "os projetos (quadros) vao contar como metas de classificacao tambem."
--
-- Ate aqui so demanda virava ponto. Projeto — `atividades_boards`, o que a
-- tela chama de projeto e o Trello chamava de quadro — nao entrava na
-- apuracao, embora seja onde mora parte do trabalho entregue.
--
-- O QUE FOI DECIDIDO, E POR QUEM
--
-- Tudo abaixo foi decidido pelo Andre, nao inferido daqui:
--
--   1. A unidade e o PROJETO INTEIRO. Um projeto concluido = uma
--      classificacao = uma entrega. Nao sao os cartoes dele.
--   2. Mesma escala de pontos das demandas: 50 / 100 / 200.
--   3. Projeto NAO exige fechamento tecnico. A justificativa da
--      classificacao, que ja e obrigatoria com 15 caracteres, faz esse papel.
--      Exigir relato criaria uma fila que ninguem preenche.
--   4. Um projeto pode ser trabalhado por MAIS DE UM desenvolvedor — o de RPA
--      tem dois. Os pontos se dividem em RATEIO IGUAL entre eles.
--
-- POR QUE RATEIO, E NAO INTEGRAL PARA CADA UM
--
-- A classificacao mede o tamanho da ENTREGA, nao o tamanho do time. Um
-- projeto que exigiu dois desenvolvedores tende a ser "Dificil" (200), e ai
-- cada um leva 100 — mais do que um "Medio" feito sozinho. Dar 200 para cada
-- um faria a mesma entrega valer o dobro so porque mais gente encostou nela,
-- e como a faixa de R$ sai do total da equipe, alocar pessoas passaria a
-- aumentar a remuneracao de todos. O rateio mantem o total da equipe igual ao
-- valor da entrega.
--
-- ARQUIVAR NAO E CONCLUIR — E ISSO MUDOU O DESENHO
--
-- A primeira ideia era usar `arquivado_em`, que ja existe. O Andre corrigiu:
--
--   "modulo AVD foi concluido, mas esta arquivado apenas para nao atrapalhar
--    visivelmente. os quadros de RPA ainda nao foram iniciados."
--
-- Arquivar e "sair da vista". Se a data que decide remuneracao fosse a de
-- arquivamento, o AVD entraria num ciclo pela razao errada e os quadros de
-- RPA — que nem comecaram — ficariam a um clique de virar dinheiro. Por isso
-- a conclusao ganha carimbo proprio, `concluido_em`, gravado por uma acao
-- deliberada. Projeto nao iniciado simplesmente nao tem o carimbo e nunca
-- aparece em fila nenhuma: nao foi preciso inventar ciclo de vida.
--
-- POR QUE TABELA NOVA EM VEZ DE GENERALIZAR A EXISTENTE
--
-- `relatorio_classificacao` tem `demanda_id` como CHAVE PRIMARIA com FK para
-- `demands`, e `20260824140000` revogou escrita nela. Trocar a chave para
-- `(tipo, id)` seria mais elegante e bem mais arriscado: mexeria na tabela e
-- no historico que decidem pagamento, com migracao de dados existentes. A
-- tabela de projeto e ADITIVA — o caminho da demanda nao e tocado em nenhuma
-- linha deste arquivo.
--
-- O QUE ESTE ARQUIVO NAO FAZ
--
-- Nao calcula dinheiro. A faixa e o R$ continuam saindo de
-- `relatorio_faixa_para` sobre o total, exatamente como antes.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. O CARIMBO DE CONCLUSAO DO PROJETO
-- ---------------------------------------------------------------------------
-- Separado de `arquivado`/`arquivado_em`, que seguem significando "sair da
-- vista" e nao sao lidos por nada aqui.

ALTER TABLE public.atividades_boards
  ADD COLUMN IF NOT EXISTS concluido_em  timestamptz,
  ADD COLUMN IF NOT EXISTS concluido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.atividades_boards.concluido_em IS
  'Quando o projeto foi concluido, por acao deliberada. E a data que decide a qual ciclo de apuracao ele pertence. NAO confundir com arquivado_em: arquivar e apenas tirar da vista.';
COMMENT ON COLUMN public.atividades_boards.arquivado_em IS
  'Quando o projeto saiu da vista. NAO significa concluido — ha projeto concluido e arquivado, e projeto arquivado que nunca comecou. A apuracao le concluido_em.';

CREATE INDEX IF NOT EXISTS atividades_boards_concluido_em
  ON public.atividades_boards (concluido_em)
  WHERE concluido_em IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. QUEM RECEBE OS PONTOS
-- ---------------------------------------------------------------------------
/**
 * Uma demanda tem `assigned_to`: um responsavel, obvio. Projeto nao tem, e
 * inventar um seria escolher quem recebe dinheiro por conta propria.
 *
 * `ordem` existe por um motivo so: quando a divisao nao fecha exata, o resto
 * vai para a ordem 0. Com a escala atual (50/100/200) e dois desenvolvedores
 * o resto e sempre zero; a coluna existe para o dia em que forem tres.
 */
CREATE TABLE IF NOT EXISTS public.relatorio_projeto_responsavel (
  projeto_id uuid NOT NULL REFERENCES public.atividades_boards(id) ON DELETE CASCADE,
  pessoa_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ordem      integer NOT NULL DEFAULT 0,

  definido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  definido_em  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rpr_chave PRIMARY KEY (projeto_id, pessoa_id),
  CONSTRAINT rpr_ordem_nao_negativa CHECK (ordem >= 0)
);

ALTER TABLE public.relatorio_projeto_responsavel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpr_leitura ON public.relatorio_projeto_responsavel;
CREATE POLICY rpr_leitura ON public.relatorio_projeto_responsavel
  FOR SELECT TO authenticated
  USING (public.tem_capacidade('relatorios.ver') OR public.is_equipe());

-- Escrita so pelas funcoes, como no resto do modulo.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_projeto_responsavel FROM authenticated;
GRANT SELECT ON public.relatorio_projeto_responsavel TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. A CLASSIFICACAO DO PROJETO
-- ---------------------------------------------------------------------------
-- Espelha `relatorio_classificacao`, incluindo a copia dos pontos: se a
-- escala mudar de 100 para 120, o que foi classificado antes continua valendo
-- 100.

CREATE TABLE IF NOT EXISTS public.relatorio_classificacao_projeto (
  projeto_id     uuid PRIMARY KEY REFERENCES public.atividades_boards(id) ON DELETE CASCADE,
  classificacao  text NOT NULL REFERENCES public.relatorio_classificacao_tipo(codigo),
  pontos         integer NOT NULL,
  justificativa  text NOT NULL,

  definido_por       uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  definido_por_email text,
  definido_em        timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- Verdadeiro quando quem classificou tambem e um dos responsaveis.
  autoclassificada   boolean NOT NULL DEFAULT false,

  CONSTRAINT rcpj_pontos_positivos CHECK (pontos > 0),
  CONSTRAINT rcpj_justificativa_substantiva CHECK (length(btrim(justificativa)) >= 15)
);

CREATE TABLE IF NOT EXISTS public.relatorio_classificacao_projeto_historico (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id          uuid NOT NULL REFERENCES public.atividades_boards(id) ON DELETE CASCADE,
  origem              text NOT NULL,

  classificacao_de    text,
  classificacao_para  text NOT NULL,
  pontos_de           integer,
  pontos_para         integer NOT NULL,

  justificativa       text NOT NULL,
  motivo_da_alteracao text,

  alterado_por        uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  alterado_por_email  text,
  alterado_em         timestamptz NOT NULL DEFAULT now(),
  autoclassificada    boolean NOT NULL DEFAULT false,

  CONSTRAINT rcpjh_origem CHECK (origem IN ('definicao', 'alteracao'))
);

CREATE INDEX IF NOT EXISTS rcpjh_por_projeto
  ON public.relatorio_classificacao_projeto_historico (projeto_id, alterado_em DESC);

ALTER TABLE public.relatorio_classificacao_projeto           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_classificacao_projeto_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rcpj_leitura ON public.relatorio_classificacao_projeto;
CREATE POLICY rcpj_leitura ON public.relatorio_classificacao_projeto
  FOR SELECT TO authenticated
  USING (public.tem_capacidade('relatorios.ver') OR public.is_equipe());

DROP POLICY IF EXISTS rcpjh_leitura ON public.relatorio_classificacao_projeto_historico;
CREATE POLICY rcpjh_leitura ON public.relatorio_classificacao_projeto_historico
  FOR SELECT TO authenticated
  USING (public.tem_capacidade('relatorios.ver') OR public.is_equipe());

-- Mesma regra das tabelas de demanda: imutaveis para o cliente.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_classificacao_projeto           FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_classificacao_projeto_historico FROM authenticated;
GRANT SELECT ON public.relatorio_classificacao_projeto           TO authenticated;
GRANT SELECT ON public.relatorio_classificacao_projeto_historico TO authenticated;


-- ---------------------------------------------------------------------------
-- 4. O ITEM CONGELADO PASSA A ACEITAR PROJETO
-- ---------------------------------------------------------------------------
/**
 * `relatorio_ciclo_item` era uma linha por demanda. Agora e uma linha por
 * (entrega, pessoa creditada):
 *
 *   demanda  -> 1 linha,  pontos integrais
 *   projeto  -> N linhas, pontos rateados entre os N responsaveis
 *
 * `rci_demanda_uma_vez UNIQUE (demanda_id)` continua valendo e nao precisa
 * mudar: em Postgres NULLs sao distintos entre si, entao as linhas de projeto
 * (com `demanda_id` nulo) nao brigam entre elas nem com as de demanda.
 */
ALTER TABLE public.relatorio_ciclo_item
  ALTER COLUMN demanda_id DROP NOT NULL;

ALTER TABLE public.relatorio_ciclo_item
  ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.atividades_boards(id) ON DELETE RESTRICT;

-- Uma linha e de demanda OU de projeto. Nunca das duas, nunca de nenhuma.
ALTER TABLE public.relatorio_ciclo_item
  DROP CONSTRAINT IF EXISTS rci_demanda_ou_projeto;
ALTER TABLE public.relatorio_ciclo_item
  ADD CONSTRAINT rci_demanda_ou_projeto
  CHECK ((demanda_id IS NOT NULL) <> (projeto_id IS NOT NULL));

-- Um projeto e apurado uma vez por pessoa creditada, para sempre.
CREATE UNIQUE INDEX IF NOT EXISTS rci_projeto_pessoa_uma_vez
  ON public.relatorio_ciclo_item (projeto_id, pessoa_id)
  WHERE projeto_id IS NOT NULL;

COMMENT ON COLUMN public.relatorio_ciclo_item.projeto_id IS
  'Preenchido nas linhas de projeto. Um projeto com dois desenvolvedores gera DUAS linhas, cada uma com metade dos pontos — o total da equipe continua sendo o valor da entrega.';


-- ---------------------------------------------------------------------------
-- 5. CONCLUIR E REABRIR O PROJETO
-- ---------------------------------------------------------------------------
/**
 * Concluir grava o carimbo E os responsaveis na mesma transacao, de propósito:
 * projeto concluido sem ninguem a creditar seria uma entrega que travaria o
 * fechamento do ciclo depois, longe da causa.
 */
CREATE OR REPLACE FUNCTION public.relatorio_concluir_projeto(
  _projeto_id    uuid,
  _responsaveis  uuid[]
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_nome  text;
  v_ja    timestamptz;
  v_n     integer;
  v_falta uuid;
BEGIN
  IF NOT (public.atividades_can_admin_board(_projeto_id)
          OR public.tem_capacidade('remuneracao.administrar')) THEN
    RAISE EXCEPTION 'Sem permissao para concluir este projeto.'
      USING HINT = 'E preciso ser administrador do projeto.';
  END IF;

  SELECT b.nome, b.concluido_em INTO v_nome, v_ja
    FROM public.atividades_boards b WHERE b.id = _projeto_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto nao encontrado.';
  END IF;
  IF v_ja IS NOT NULL THEN
    RAISE EXCEPTION 'O projeto "%" ja foi concluido em %.', v_nome, v_ja::date
      USING HINT = 'Para corrigir, reabra o projeto antes.';
  END IF;

  v_n := coalesce(array_length(_responsaveis, 1), 0);
  IF v_n = 0 THEN
    RAISE EXCEPTION 'Informe quem trabalhou no projeto.'
      USING HINT = 'Os pontos da classificacao sao rateados entre os responsaveis; sem responsavel nao ha a quem creditar.';
  END IF;

  -- Duplicata na lista viraria rateio errado silenciosamente.
  IF v_n <> (SELECT count(DISTINCT x) FROM unnest(_responsaveis) AS x) THEN
    RAISE EXCEPTION 'A lista de responsaveis tem repeticao.';
  END IF;

  SELECT x INTO v_falta
    FROM unnest(_responsaveis) AS x
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = x)
   LIMIT 1;
  IF v_falta IS NOT NULL THEN
    RAISE EXCEPTION 'Responsavel inexistente: %', v_falta;
  END IF;

  DELETE FROM public.relatorio_projeto_responsavel WHERE projeto_id = _projeto_id;

  INSERT INTO public.relatorio_projeto_responsavel
    (projeto_id, pessoa_id, ordem, definido_por)
  SELECT _projeto_id, r.pessoa, r.ordem - 1, v_uid
    FROM unnest(_responsaveis) WITH ORDINALITY AS r(pessoa, ordem);

  UPDATE public.atividades_boards
     SET concluido_em = now(), concluido_por = v_uid, updated_at = now()
   WHERE id = _projeto_id
  RETURNING concluido_em INTO v_ja;

  RETURN v_ja;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_concluir_projeto(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_concluir_projeto(uuid, uuid[]) TO authenticated;


/**
 * Reabrir tira o carimbo. NAO apaga a classificacao — reabrir nao desfaz uma
 * decisao tomada, so devolve o projeto ao fluxo. E recusa se o projeto ja foi
 * congelado num ciclo: dinheiro apurado nao volta atras por aqui.
 */
CREATE OR REPLACE FUNCTION public.relatorio_reabrir_projeto(_projeto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ciclo text;
BEGIN
  IF NOT (public.atividades_can_admin_board(_projeto_id)
          OR public.tem_capacidade('remuneracao.administrar')) THEN
    RAISE EXCEPTION 'Sem permissao para reabrir este projeto.';
  END IF;

  SELECT c.rotulo INTO v_ciclo
    FROM public.relatorio_ciclo_item i
    JOIN public.relatorio_ciclo c ON c.id = i.ciclo_id
   WHERE i.projeto_id = _projeto_id
   LIMIT 1;
  IF v_ciclo IS NOT NULL THEN
    RAISE EXCEPTION 'Este projeto ja foi apurado no ciclo %.', v_ciclo
      USING HINT = 'Reabrir depois da apuracao mudaria um ciclo fechado.';
  END IF;

  UPDATE public.atividades_boards
     SET concluido_em = NULL, concluido_por = NULL, updated_at = now()
   WHERE id = _projeto_id;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_reabrir_projeto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_reabrir_projeto(uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- 6. CLASSIFICAR O PROJETO
-- ---------------------------------------------------------------------------
-- Espelha `relatorio_classificar`: mesma capacidade, mesma exigencia de
-- justificativa, mesmo motivo obrigatorio na alteracao, mesmo historico. As
-- diferencas sao duas, e as duas foram decididas: exige `concluido_em` em vez
-- de `status = 'concluido'`, e NAO exige fechamento tecnico.

CREATE OR REPLACE FUNCTION public.relatorio_classificar_projeto(
  _projeto_id    uuid,
  _classificacao text,
  _justificativa text,
  _motivo        text DEFAULT NULL
)
RETURNS public.relatorio_classificacao_projeto
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text;
  v_nome      text;
  v_concluido timestamptz;
  v_pontos    integer;
  v_n         integer;
  v_anterior  public.relatorio_classificacao_projeto;
  v_auto      boolean;
  v_saida     public.relatorio_classificacao_projeto;
BEGIN
  IF NOT public.tem_capacidade('classificacao.definir') THEN
    RAISE EXCEPTION 'Sem permissao para classificar.'
      USING HINT = 'E preciso a capacidade classificacao.definir.';
  END IF;

  SELECT b.nome, b.concluido_em INTO v_nome, v_concluido
    FROM public.atividades_boards b WHERE b.id = _projeto_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto nao encontrado.';
  END IF;

  IF v_concluido IS NULL THEN
    RAISE EXCEPTION 'O projeto "%" nao esta concluido.', v_nome
      USING HINT = 'Classificar define pontos que viram remuneracao. Conclua o projeto primeiro — arquivar nao conclui.';
  END IF;

  SELECT count(*) INTO v_n
    FROM public.relatorio_projeto_responsavel WHERE projeto_id = _projeto_id;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'O projeto "%" nao tem responsavel registrado.', v_nome
      USING HINT = 'Sem responsavel nao ha a quem ratear os pontos.';
  END IF;

  SELECT t.pontos INTO v_pontos
    FROM public.relatorio_classificacao_tipo t
   WHERE t.codigo = _classificacao AND t.ativo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Classificacao invalida ou inativa: %', _classificacao;
  END IF;

  -- A guarda do rateio. `rci_pontos_positivos` exige pontos > 0 em cada linha
  -- congelada; recusar aqui e melhor do que estourar no fechamento do ciclo.
  IF v_pontos / v_n < 1 THEN
    RAISE EXCEPTION
      'Nao da para ratear % pontos entre % responsaveis sem alguem ficar com zero.',
      v_pontos, v_n
      USING HINT = 'Escolha uma classificacao maior ou reveja a lista de responsaveis.';
  END IF;

  IF length(btrim(coalesce(_justificativa, ''))) < 15 THEN
    RAISE EXCEPTION 'A justificativa e obrigatoria e precisa explicar a decisao.'
      USING HINT = 'Diga por que o escopo, o impacto ou o risco levam a esta classificacao.';
  END IF;

  SELECT * INTO v_anterior FROM public.relatorio_classificacao_projeto
   WHERE projeto_id = _projeto_id;

  IF FOUND AND length(btrim(coalesce(_motivo, ''))) < 10 THEN
    RAISE EXCEPTION 'Alterar uma classificacao existente exige o motivo da mudanca.'
      USING HINT = format('Hoje esta %s. Explique o que mudou no entendimento.',
                          v_anterior.classificacao);
  END IF;

  v_auto := EXISTS (
    SELECT 1 FROM public.relatorio_projeto_responsavel r
     WHERE r.projeto_id = _projeto_id AND r.pessoa_id = v_uid
  );

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.relatorio_classificacao_projeto AS cp
    (projeto_id, classificacao, pontos, justificativa,
     definido_por, definido_por_email, autoclassificada)
  VALUES
    (_projeto_id, _classificacao, v_pontos, btrim(_justificativa),
     v_uid, v_email, v_auto)
  ON CONFLICT (projeto_id) DO UPDATE SET
    classificacao      = EXCLUDED.classificacao,
    pontos             = EXCLUDED.pontos,
    justificativa      = EXCLUDED.justificativa,
    definido_por       = EXCLUDED.definido_por,
    definido_por_email = EXCLUDED.definido_por_email,
    autoclassificada   = EXCLUDED.autoclassificada,
    definido_em        = now(),
    updated_at         = now()
  RETURNING cp.* INTO v_saida;

  INSERT INTO public.relatorio_classificacao_projeto_historico
    (projeto_id, origem,
     classificacao_de, classificacao_para, pontos_de, pontos_para,
     justificativa, motivo_da_alteracao, alterado_por, alterado_por_email,
     autoclassificada)
  VALUES
    (_projeto_id,
     CASE WHEN v_anterior.projeto_id IS NULL THEN 'definicao' ELSE 'alteracao' END,
     v_anterior.classificacao, _classificacao,
     v_anterior.pontos, v_pontos,
     btrim(_justificativa),
     CASE WHEN v_anterior.projeto_id IS NULL THEN NULL ELSE btrim(_motivo) END,
     v_uid, v_email, v_auto);

  RETURN v_saida;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_classificar_projeto(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_classificar_projeto(uuid, text, text, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- 7. A FILA DE PROJETOS PARA CLASSIFICAR
-- ---------------------------------------------------------------------------
-- Funcao NOVA, em vez de mexer em `relatorio_pendencias_de_classificacao`.
-- Aquela devolve 27 colunas de demanda e alimenta a tela que ja funciona;
-- trocar a assinatura dela para caber projeto quebraria o caminho existente
-- por nenhum ganho. A tela junta as duas listas.

CREATE OR REPLACE FUNCTION public.relatorio_projetos_para_classificar()
RETURNS TABLE (
  projeto_id       uuid,
  slug             text,
  nome             text,
  concluido_em     timestamptz,
  concluido_por    text,
  responsaveis     integer,
  responsavel_nomes text,
  cartoes          integer,
  ja_classificado  boolean,
  classificacao    text,
  rotulo           text,
  pontos           integer,
  pontos_por_pessoa integer,
  justificativa    text,
  classificado_por text,
  classificado_em  timestamptz,
  autoclassificada boolean,
  vezes_alterada   integer,
  apurado_no_ciclo text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.tem_capacidade('classificacao.definir')
          OR public.tem_capacidade('relatorios.ver')
          OR public.is_equipe()) THEN
    RAISE EXCEPTION 'Sem permissao.';
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.slug, b.nome,
    b.concluido_em,
    -- `auth.users.email` e varchar; a coluna declarada e text. Sem o cast,
    -- plpgsql recusa com "structure of query does not match function result
    -- type" na primeira execucao, longe daqui.
    pc.email::text,
    coalesce(r.n, 0)::integer,
    r.nomes,
    coalesce(k.n, 0)::integer,
    (cp.projeto_id IS NOT NULL),
    cp.classificacao,
    tipo.rotulo,
    cp.pontos,
    -- O que cada um leva, para a tela poder mostrar a divisao antes de
    -- confirmar. E o piso da divisao: no fechamento, o resto vai para a ordem
    -- 0, entao com escala que nao divide exato um dos responsaveis recebe um
    -- pouco mais do que este numero. Com 50/100/200 e dois responsaveis o
    -- resto e sempre zero e os dois batem.
    CASE WHEN cp.pontos IS NULL OR coalesce(r.n, 0) = 0
         THEN NULL ELSE (cp.pontos / r.n)::integer END,
    cp.justificativa,
    cp.definido_por_email,
    cp.definido_em,
    coalesce(cp.autoclassificada, false),
    coalesce(h.n, 0)::integer,
    ci.rotulo
  FROM public.atividades_boards b
  LEFT JOIN public.relatorio_classificacao_projeto cp ON cp.projeto_id = b.id
  LEFT JOIN public.relatorio_classificacao_tipo tipo ON tipo.codigo = cp.classificacao
  LEFT JOIN auth.users pc ON pc.id = b.concluido_por
  LEFT JOIN LATERAL (
    SELECT count(*) AS n,
           string_agg(coalesce(p.nome, u.email::text), ', ' ORDER BY rr.ordem) AS nomes
      FROM public.relatorio_projeto_responsavel rr
      LEFT JOIN public.profiles p ON p.id = rr.pessoa_id
      LEFT JOIN auth.users u ON u.id = rr.pessoa_id
     WHERE rr.projeto_id = b.id
  ) r ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.atividades_cards c WHERE c.board_id = b.id
  ) k ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.relatorio_classificacao_projeto_historico hh
     WHERE hh.projeto_id = b.id AND hh.origem = 'alteracao'
  ) h ON true
  LEFT JOIN LATERAL (
    SELECT cc.rotulo
      FROM public.relatorio_ciclo_item ii
      JOIN public.relatorio_ciclo cc ON cc.id = ii.ciclo_id
     WHERE ii.projeto_id = b.id
     LIMIT 1
  ) ci ON true
  -- Projeto nao iniciado nao tem carimbo e nao aparece. Arquivado nao filtra:
  -- o AVD esta concluido E arquivado, e tem de ser classificado.
  WHERE b.concluido_em IS NOT NULL
  ORDER BY (cp.projeto_id IS NOT NULL), b.concluido_em DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_projetos_para_classificar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_projetos_para_classificar() TO authenticated;


-- ---------------------------------------------------------------------------
-- 8. A APURACAO AO VIVO SOMA OS PROJETOS
-- ---------------------------------------------------------------------------
/**
 * Mesma assinatura, mesmas 16 colunas: nao precisa de DROP.
 *
 * Note que aqui o projeto entra UMA vez, com os pontos INTEGRAIS. O rateio e
 * assunto do congelamento, onde existe uma linha por pessoa. Fazer diferente
 * faria o total ao vivo e o total congelado discordarem — e o segundo e o que
 * vira dinheiro.
 */
CREATE OR REPLACE FUNCTION public.relatorio_resultado_do_ciclo(_ciclo_id uuid)
RETURNS TABLE (
  ciclo_rotulo       text,
  inicio             timestamptz,
  fim                timestamptz,
  situacao           text,
  congelado          boolean,
  meta_pontos        integer,
  pontos             integer,
  percentual         numeric,
  entregas           integer,
  facil              integer,
  media              integer,
  dificil            integer,
  faixa_rotulo       text,
  valor_reais        numeric,
  faixa_indefinida   boolean,
  mensagem           text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c        public.relatorio_ciclo;
  v_pontos integer := 0;
  v_ent    integer := 0;
  v_f      integer := 0;
  v_m      integer := 0;
  v_d      integer := 0;
  -- Os do projeto, somados depois.
  p_pontos integer := 0;
  p_ent    integer := 0;
  p_f      integer := 0;
  p_m      integer := 0;
  p_d      integer := 0;
  v_pct    numeric;
  v_faixa       public.relatorio_faixa;
  v_faixa_rot   text;
  v_faixa_valor numeric;
  v_indef       boolean;
BEGIN
  IF NOT (public.tem_capacidade('remuneracao.ver_todas')
          OR public.tem_capacidade('remuneracao.ver_propria')) THEN
    RAISE EXCEPTION 'Sem permissao para ver a apuracao.'
      USING HINT = 'E preciso uma capacidade de remuneracao.';
  END IF;

  SELECT * INTO c FROM public.relatorio_ciclo WHERE id = _ciclo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo nao encontrado.'; END IF;

  IF c.situacao IN ('fechado', 'aprovado') THEN
    SELECT r.pontos, r.entregas, r.facil, r.media, r.dificil,
           r.percentual, r.faixa_rotulo, r.valor_reais, r.faixa_indefinida
      INTO v_pontos, v_ent, v_f, v_m, v_d, v_pct, v_faixa_rot,
           v_faixa_valor, v_indef
      FROM public.relatorio_ciclo_resultado r
     WHERE r.ciclo_id = _ciclo_id AND r.pessoa_id IS NULL;

    RETURN QUERY SELECT
      c.rotulo, c.inicio, c.fim, c.situacao, true,
      c.meta_pontos, coalesce(v_pontos, 0), v_pct,
      coalesce(v_ent, 0), coalesce(v_f, 0), coalesce(v_m, 0), coalesce(v_d, 0),
      v_faixa_rot, v_faixa_valor, coalesce(v_indef, false),
      CASE WHEN coalesce(v_indef, false)
           THEN 'Faixa de remuneracao nao definida'
           ELSE coalesce(v_faixa_rot, '') END;
    RETURN;
  END IF;

  -- Demandas: inalterado.
  SELECT
    coalesce(sum(cls.pontos), 0),
    count(*),
    count(*) FILTER (WHERE cls.classificacao = 'facil'),
    count(*) FILTER (WHERE cls.classificacao = 'media'),
    count(*) FILTER (WHERE cls.classificacao = 'dificil')
  INTO v_pontos, v_ent, v_f, v_m, v_d
  FROM public.demands d
  JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  JOIN public.relatorio_fechamento_tecnico f
       ON f.demanda_id = d.id AND f.situacao = 'concluido'
  JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    AND rcl.procedencia = 'confirmada'
    AND rcl.data_conclusao >= c.inicio
    AND rcl.data_conclusao <  c.fim;

  -- Projetos: concluidos na janela, classificados e com responsavel.
  SELECT
    coalesce(sum(cp.pontos), 0),
    count(*),
    count(*) FILTER (WHERE cp.classificacao = 'facil'),
    count(*) FILTER (WHERE cp.classificacao = 'media'),
    count(*) FILTER (WHERE cp.classificacao = 'dificil')
  INTO p_pontos, p_ent, p_f, p_m, p_d
  FROM public.atividades_boards b
  JOIN public.relatorio_classificacao_projeto cp ON cp.projeto_id = b.id
  WHERE b.concluido_em IS NOT NULL
    AND b.concluido_em >= c.inicio
    AND b.concluido_em <  c.fim
    AND EXISTS (SELECT 1 FROM public.relatorio_projeto_responsavel r
                 WHERE r.projeto_id = b.id);

  v_pontos := v_pontos + p_pontos;
  v_ent    := v_ent + p_ent;
  v_f      := v_f + p_f;
  v_m      := v_m + p_m;
  v_d      := v_d + p_d;

  v_pct := CASE WHEN c.meta_pontos > 0
                THEN round(100.0 * v_pontos / c.meta_pontos, 4)
                ELSE 0 END;

  SELECT * INTO v_faixa FROM public.relatorio_faixa_para(v_pct, c.inicio::date);
  v_indef := (v_faixa.id IS NULL) OR (v_faixa.valor_reais IS NULL);

  RETURN QUERY SELECT
    c.rotulo, c.inicio, c.fim, c.situacao, false,
    c.meta_pontos, v_pontos, v_pct,
    v_ent::integer, v_f::integer, v_m::integer, v_d::integer,
    v_faixa.rotulo,
    CASE WHEN v_indef THEN NULL ELSE v_faixa.valor_reais END,
    v_indef,
    CASE WHEN v_indef THEN 'Faixa de remuneracao nao definida'
         ELSE coalesce(v_faixa.rotulo, '') END;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_resultado_do_ciclo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_resultado_do_ciclo(uuid)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 9. O FECHAMENTO CONGELA O PROJETO, RATEADO
-- ---------------------------------------------------------------------------
/**
 * Esta e a parte que NAO PODIA FICAR DE FORA. `relatorio_fechar_ciclo` grava
 * o snapshot, e e o snapshot que a apuracao le depois de fechado. Se o
 * projeto entrasse so na soma ao vivo, os pontos dele desapareceriam no
 * fechamento — o ciclo fecharia com menos do que a tela mostrava no dia
 * anterior.
 *
 * DUAS COISAS MUDAM, E A SEGUNDA E FACIL DE ESQUECER:
 *
 *   a) Uma linha por (projeto, responsavel), com `pontos / n`. O resto da
 *      divisao vai para a `ordem` 0 — assim a soma das linhas e EXATAMENTE os
 *      pontos da classificacao, sem ponto sumindo no arredondamento.
 *
 *   b) A linha da EQUIPE contava `count(*)` sobre os itens. Com projeto
 *      rateado, um projeto de dois desenvolvedores viraria duas entregas e
 *      dois "medios". `entregas`, `facil`, `media` e `dificil` passam a contar
 *      ENTREGAS, nao linhas. `sum(pontos)` continua igual — e por isso o
 *      dinheiro nao muda.
 *
 * O que NAO soma, e esta certo que nao some: as `entregas` das linhas por
 * pessoa. Duas pessoas na mesma entrega dao 1 para a equipe e 1 para cada uma.
 * Somar as pessoas daria 2, que nao e o numero de entregas do ciclo. Os
 * PONTOS, sim, somam exatamente.
 */
CREATE OR REPLACE FUNCTION public.relatorio_fechar_ciclo(_ciclo_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c        public.relatorio_ciclo;
  v_uid    uuid := auth.uid();
  v_n      integer;
  v_pontos integer;
  v_pct    numeric;
  v_faixa  public.relatorio_faixa;
  v_indef  boolean;
BEGIN
  IF NOT public.tem_capacidade('remuneracao.administrar') THEN
    RAISE EXCEPTION 'Sem permissao para fechar ciclo.'
      USING HINT = 'E preciso a capacidade remuneracao.administrar.';
  END IF;

  SELECT * INTO c FROM public.relatorio_ciclo WHERE id = _ciclo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo nao encontrado.'; END IF;
  IF c.situacao IN ('fechado', 'aprovado') THEN
    RAISE EXCEPTION 'O ciclo % ja esta %.', c.rotulo, c.situacao;
  END IF;

  -- 9.1 DEMANDAS — inalterado desde 20260823180000.
  INSERT INTO public.relatorio_ciclo_item
    (ciclo_id, demanda_id, ticket_code, titulo, sistema_slug,
     pessoa_id, pessoa_nome, pessoa_email, concluida_em,
     classificacao, classificacao_rotulo, pontos, justificativa,
     autoclassificada, classificada_por, minutos_lancados)
  SELECT
    _ciclo_id, d.id, d.ticket_code, d.title, d.sistema_slug,
    d.assigned_to, p.nome, p.email, rcl.data_conclusao,
    cls.classificacao, tipo.rotulo, cls.pontos, cls.justificativa,
    cls.autoclassificada, cls.definido_por_email,
    coalesce(iv.minutos, 0)::integer
  FROM public.demands d
  JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  JOIN public.relatorio_fechamento_tecnico f
       ON f.demanda_id = d.id AND f.situacao = 'concluido'
  JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao_tipo tipo ON tipo.codigo = cls.classificacao
  LEFT JOIN public.profiles p ON p.id = d.assigned_to
  LEFT JOIN LATERAL (
    SELECT sum(EXTRACT(EPOCH FROM (i.fim - i.inicio)) / 60) AS minutos
      FROM public.relatorio_intervalo i WHERE i.demanda_id = d.id
  ) iv ON true
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    AND d.assigned_to IS NOT NULL
    AND rcl.procedencia = 'confirmada'
    AND rcl.data_conclusao >= c.inicio
    AND rcl.data_conclusao <  c.fim
  ON CONFLICT (demanda_id) DO NOTHING;

  -- 9.2 PROJETOS — uma linha por responsavel, com rateio igual.
  INSERT INTO public.relatorio_ciclo_item
    (ciclo_id, projeto_id, ticket_code, titulo, sistema_slug,
     pessoa_id, pessoa_nome, pessoa_email, concluida_em,
     classificacao, classificacao_rotulo, pontos, justificativa,
     autoclassificada, classificada_por, minutos_lancados)
  SELECT
    _ciclo_id, b.id, b.slug, b.nome, NULL,
    r.pessoa_id, p.nome, p.email, b.concluido_em,
    cp.classificacao, tipo.rotulo,
    -- O rateio. O resto da divisao vai para a ordem 0, para a soma das linhas
    -- fechar exatamente nos pontos da classificacao.
    (cp.pontos / t.n) + CASE WHEN r.ordem = 0 THEN cp.pontos % t.n ELSE 0 END,
    cp.justificativa,
    cp.autoclassificada, cp.definido_por_email,
    0
  FROM public.atividades_boards b
  JOIN public.relatorio_classificacao_projeto cp ON cp.projeto_id = b.id
  JOIN public.relatorio_projeto_responsavel r ON r.projeto_id = b.id
  JOIN LATERAL (
    SELECT count(*)::integer AS n
      FROM public.relatorio_projeto_responsavel rr WHERE rr.projeto_id = b.id
  ) t ON true
  LEFT JOIN public.relatorio_classificacao_tipo tipo ON tipo.codigo = cp.classificacao
  LEFT JOIN public.profiles p ON p.id = r.pessoa_id
  WHERE b.concluido_em IS NOT NULL
    AND b.concluido_em >= c.inicio
    AND b.concluido_em <  c.fim
    AND (cp.pontos / t.n) >= 1
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_n FROM public.relatorio_ciclo_item WHERE ciclo_id = _ciclo_id;

  -- 9.3 Uma linha por pessoa. `count(*)` aqui esta certo: e "entregas em que
  -- esta pessoa participou".
  INSERT INTO public.relatorio_ciclo_resultado
    (ciclo_id, pessoa_id, pessoa_nome, pessoa_email,
     entregas, facil, media, dificil, pontos)
  SELECT
    _ciclo_id, i.pessoa_id, i.pessoa_nome, i.pessoa_email,
    count(*)::integer,
    count(*) FILTER (WHERE i.classificacao = 'facil')::integer,
    count(*) FILTER (WHERE i.classificacao = 'media')::integer,
    count(*) FILTER (WHERE i.classificacao = 'dificil')::integer,
    sum(i.pontos)::integer
  FROM public.relatorio_ciclo_item i
  WHERE i.ciclo_id = _ciclo_id
  GROUP BY i.pessoa_id, i.pessoa_nome, i.pessoa_email
  ON CONFLICT ON CONSTRAINT rcr_chave DO NOTHING;

  SELECT coalesce(sum(pontos), 0) INTO v_pontos
    FROM public.relatorio_ciclo_item WHERE ciclo_id = _ciclo_id;

  v_pct := CASE WHEN c.meta_pontos > 0
                THEN round(100.0 * v_pontos / c.meta_pontos, 4) ELSE 0 END;

  SELECT * INTO v_faixa FROM public.relatorio_faixa_para(v_pct, c.inicio::date);
  v_indef := (v_faixa.id IS NULL) OR (v_faixa.valor_reais IS NULL);

  -- 9.4 A linha da EQUIPE. Conta ENTREGAS, nao linhas — ver (b) no comentario.
  INSERT INTO public.relatorio_ciclo_resultado
    (ciclo_id, pessoa_id, entregas, facil, media, dificil, pontos,
     meta_pontos, percentual, faixa_id, faixa_rotulo, valor_reais, faixa_indefinida)
  SELECT
    _ciclo_id, NULL,
    count(DISTINCT coalesce(demanda_id, projeto_id))::integer,
    count(DISTINCT coalesce(demanda_id, projeto_id))
      FILTER (WHERE classificacao = 'facil')::integer,
    count(DISTINCT coalesce(demanda_id, projeto_id))
      FILTER (WHERE classificacao = 'media')::integer,
    count(DISTINCT coalesce(demanda_id, projeto_id))
      FILTER (WHERE classificacao = 'dificil')::integer,
    coalesce(sum(pontos), 0)::integer,
    c.meta_pontos, v_pct,
    v_faixa.id, v_faixa.rotulo,
    CASE WHEN v_indef THEN NULL ELSE v_faixa.valor_reais END,
    v_indef
  FROM public.relatorio_ciclo_item WHERE ciclo_id = _ciclo_id
  ON CONFLICT ON CONSTRAINT rcr_chave DO NOTHING;

  UPDATE public.relatorio_ciclo
     SET situacao = 'fechado', fechado_por = v_uid, fechado_em = now()
   WHERE id = _ciclo_id;

  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_fechar_ciclo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_fechar_ciclo(uuid)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 10. AS PENDENCIAS GANHAM TRES COLUNAS, SEM MEXER NA PARTICAO EXISTENTE
-- ---------------------------------------------------------------------------
/**
 * A particao de demandas de `20260825140000` continua identica:
 *
 *   concluidas_no_ciclo = elegiveis + sem_fechamento
 *                       + sem_classificacao + sem_data_confiavel
 *
 * Projeto NAO entra nesses numeros. Se entrasse, "47 concluidas" passaria a
 * misturar demanda com projeto e a frase da tela mudaria de significado sem
 * ninguem pedir. Os projetos vem em tres colunas proprias, e a tela decide
 * como apresentar.
 *
 * Projeto tem so duas saidas possiveis — classificado ou nao — porque a data
 * dele e explicita (nao ha "procedencia" a confirmar) e ele nao passa por
 * fechamento tecnico. Entao:
 *
 *   projetos_concluidos = projetos_elegiveis + projetos_sem_classificacao
 */
DROP FUNCTION IF EXISTS public.relatorio_pendencias_do_ciclo(uuid);

CREATE OR REPLACE FUNCTION public.relatorio_pendencias_do_ciclo(_ciclo_id uuid)
RETURNS TABLE (
  -- A particao das DEMANDAS. Estas quatro somam `concluidas_no_ciclo`.
  concluidas_no_ciclo integer,
  elegiveis           integer,
  sem_fechamento      integer,
  sem_classificacao   integer,
  sem_data_confiavel  integer,
  -- Cumulativas. NAO somar com as de cima.
  com_fechamento      integer,
  classificadas       integer,
  -- Os PROJETOS. Estas duas somam `projetos_concluidos`.
  projetos_concluidos        integer,
  projetos_elegiveis         integer,
  projetos_sem_classificacao integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim    timestamptz;
  p_tot    integer;
  p_ok     integer;
BEGIN
  IF NOT (public.tem_capacidade('relatorios.ver') OR public.is_equipe()) THEN
    RAISE EXCEPTION 'Sem permissao.';
  END IF;

  SELECT c.inicio, c.fim INTO v_inicio, v_fim
    FROM public.relatorio_ciclo c WHERE c.id = _ciclo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo nao encontrado.'; END IF;

  -- Elegivel para projeto: classificado E com responsavel a quem creditar.
  SELECT
    count(*)::integer,
    count(*) FILTER (
      WHERE cp.projeto_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.relatorio_projeto_responsavel r
                     WHERE r.projeto_id = b.id))::integer
  INTO p_tot, p_ok
  FROM public.atividades_boards b
  LEFT JOIN public.relatorio_classificacao_projeto cp ON cp.projeto_id = b.id
  WHERE b.concluido_em IS NOT NULL
    AND b.concluido_em >= v_inicio
    AND b.concluido_em <  v_fim;

  RETURN QUERY
  SELECT
    count(*)::integer,
    count(*) FILTER (
      WHERE rcl.procedencia = 'confirmada'
        AND coalesce(f.situacao, 'x') = 'concluido'
        AND cls.demanda_id IS NOT NULL)::integer,
    count(*) FILTER (
      WHERE rcl.procedencia = 'confirmada'
        AND coalesce(f.situacao, 'x') <> 'concluido')::integer,
    count(*) FILTER (
      WHERE rcl.procedencia = 'confirmada'
        AND coalesce(f.situacao, 'x') = 'concluido'
        AND cls.demanda_id IS NULL)::integer,
    count(*) FILTER (WHERE rcl.procedencia <> 'confirmada')::integer,
    count(*) FILTER (WHERE coalesce(f.situacao, 'x') = 'concluido')::integer,
    count(*) FILTER (WHERE cls.demanda_id IS NOT NULL)::integer,
    p_tot, p_ok, (p_tot - p_ok)
  FROM public.demands d
  JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    AND rcl.data_conclusao IS NOT NULL
    AND rcl.data_conclusao >= v_inicio
    AND rcl.data_conclusao <  v_fim;
END $$;

-- O DROP levou os privilegios.
REVOKE ALL ON FUNCTION public.relatorio_pendencias_do_ciclo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_pendencias_do_ciclo(uuid) TO authenticated;


-- ===========================================================================
-- CONFERENCIA
-- ===========================================================================
-- Le as tabelas direto, sem chamar as funcoes: no SQL Editor nao ha JWT e a
-- checagem de capacidade derrubaria a migration no rollback.

-- 1. Estado dos projetos. `concluido_em` e `arquivado` sao INDEPENDENTES —
--    esperado ver projeto concluido e arquivado (o AVD) e projeto arquivado
--    sem conclusao.
SELECT
  count(*)                                              AS projetos,
  count(*) FILTER (WHERE concluido_em IS NOT NULL)      AS concluidos,
  count(*) FILTER (WHERE arquivado)                     AS arquivados,
  count(*) FILTER (WHERE arquivado AND concluido_em IS NOT NULL)
                                                        AS arquivados_e_concluidos,
  count(*) FILTER (WHERE concluido_em IS NULL)          AS sem_conclusao
FROM public.atividades_boards;

-- 2. O rateio fecha? Para cada projeto classificado, a soma das linhas
--    congeladas tem de ser EXATAMENTE os pontos da classificacao.
--    `fecha` precisa dar 'sim' em toda linha.
SELECT
  b.nome,
  cp.classificacao,
  cp.pontos                                   AS pontos_da_entrega,
  count(i.id)                                 AS linhas_congeladas,
  coalesce(sum(i.pontos), 0)                  AS soma_das_linhas,
  CASE WHEN count(i.id) = 0 THEN 'nao apurado'
       WHEN coalesce(sum(i.pontos), 0) = cp.pontos THEN 'sim'
       ELSE 'NAO' END                         AS fecha
FROM public.atividades_boards b
JOIN public.relatorio_classificacao_projeto cp ON cp.projeto_id = b.id
LEFT JOIN public.relatorio_ciclo_item i ON i.projeto_id = b.id
GROUP BY b.nome, cp.classificacao, cp.pontos
ORDER BY b.nome;

-- 3. Nenhuma linha congelada pode ser de demanda E projeto, nem de nenhum dos
--    dois. `rci_demanda_ou_projeto` garante; isto confirma no dado existente.
SELECT count(*) AS linhas_invalidas
FROM public.relatorio_ciclo_item
WHERE (demanda_id IS NOT NULL) = (projeto_id IS NOT NULL);
