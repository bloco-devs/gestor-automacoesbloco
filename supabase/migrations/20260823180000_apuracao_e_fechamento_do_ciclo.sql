-- ===========================================================================
-- ETAPA 5 — APURAÇÃO DO CICLO, FAIXA NO BANCO E FECHAMENTO COM SNAPSHOT
-- ===========================================================================
--
-- Três coisas:
--
--   1. O resultado do ciclo — pontos, percentual, faixa e valor — calculado
--      NO BANCO. O frontend recebe pronto e exibe. Valor financeiro derivado
--      na tela seria impossível de auditar depois: bastaria um `?? 0` num
--      lugar errado para "faixa não definida" virar "R$ 0,00".
--
--   2. As pendências do ciclo, explícitas. O RH precisa saber POR QUE o
--      número de pontos não corresponde ao número de demandas concluídas.
--
--   3. O snapshot. `relatorio_ciclo.situacao` já tinha 'fechado' e o gatilho
--      de imutabilidade, mas nada congelava o RESULTADO — então fechar um
--      ciclo e reclassificar uma demanda depois mudaria o valor de um período
--      já encerrado, em silêncio.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. AS PENDÊNCIAS DO CICLO
-- ---------------------------------------------------------------------------
-- Cada número aqui é uma razão para a soma de pontos ser menor que o total de
-- entregas. Sem isso, o RH olha "12 concluídas, 400 pontos" e conclui que
-- alguém trabalhou pouco — quando o que houve foi formulário não preenchido.

CREATE OR REPLACE FUNCTION public.relatorio_pendencias_do_ciclo(_ciclo_id uuid)
RETURNS TABLE (
  concluidas_no_ciclo    integer,
  elegiveis              integer,
  sem_fechamento         integer,
  sem_classificacao      integer,
  sem_data_confiavel     integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim    timestamptz;
BEGIN
  IF NOT (public.tem_capacidade('relatorios.ver') OR public.is_equipe()) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  SELECT c.inicio, c.fim INTO v_inicio, v_fim
    FROM public.relatorio_ciclo c WHERE c.id = _ciclo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo não encontrado.'; END IF;

  RETURN QUERY
  SELECT
    count(*)::integer,
    count(*) FILTER (
      WHERE rcl.procedencia = 'confirmada'
        AND f.situacao = 'concluido'
        AND cls.demanda_id IS NOT NULL
    )::integer,
    count(*) FILTER (WHERE coalesce(f.situacao, 'x') <> 'concluido')::integer,
    count(*) FILTER (
      WHERE f.situacao = 'concluido' AND cls.demanda_id IS NULL
    )::integer,
    count(*) FILTER (WHERE rcl.procedencia <> 'confirmada')::integer
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

REVOKE ALL ON FUNCTION public.relatorio_pendencias_do_ciclo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_pendencias_do_ciclo(uuid)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 2. O SNAPSHOT
-- ---------------------------------------------------------------------------
--
-- Por que CÓPIA e não consulta com join: se o resultado fosse recalculado a
-- cada leitura, alterar a classificação de uma demanda em outubro mudaria o
-- valor apurado de agosto — que o RH já conferiu e usou na folha. O snapshot
-- é a diferença entre um relatório e um livro-caixa.
--
-- Congelado no FECHAMENTO, não na aprovação: o RH revisa números que já não
-- se movem, em vez de uma prévia que muda entre a conferência e a assinatura.

CREATE TABLE IF NOT EXISTS public.relatorio_ciclo_item (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id          uuid NOT NULL REFERENCES public.relatorio_ciclo(id) ON DELETE RESTRICT,
  demanda_id        uuid NOT NULL REFERENCES public.demands(id) ON DELETE RESTRICT,

  -- Tudo copiado. `demands.title` é editável, `profiles.nome` muda, a escala
  -- de pontos pode ser alterada — e nenhuma dessas mudanças pode reescrever
  -- o que foi apurado.
  ticket_code       text NOT NULL,
  titulo            text NOT NULL,
  sistema_slug      text,
  pessoa_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  pessoa_nome       text,
  pessoa_email      text,
  concluida_em      timestamptz NOT NULL,
  classificacao     text NOT NULL,
  classificacao_rotulo text,
  pontos            integer NOT NULL,
  justificativa     text,
  autoclassificada  boolean NOT NULL DEFAULT false,
  classificada_por  text,
  minutos_lancados  integer NOT NULL DEFAULT 0,

  congelado_em      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rci_pontos_positivos CHECK (pontos > 0),
  -- Uma entrega é apurada uma vez, em um ciclo, para sempre.
  CONSTRAINT rci_demanda_uma_vez UNIQUE (demanda_id)
);

CREATE INDEX IF NOT EXISTS relatorio_ciclo_item_ciclo
  ON public.relatorio_ciclo_item (ciclo_id);
CREATE INDEX IF NOT EXISTS relatorio_ciclo_item_pessoa
  ON public.relatorio_ciclo_item (pessoa_id, ciclo_id);

-- O resultado da equipe e de cada pessoa, também congelado.
CREATE TABLE IF NOT EXISTS public.relatorio_ciclo_resultado (
  ciclo_id           uuid NOT NULL REFERENCES public.relatorio_ciclo(id) ON DELETE RESTRICT,
  -- NULL = a linha da EQUIPE. Uma linha por pessoa, mais uma do conjunto.
  pessoa_id          uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  pessoa_nome        text,
  pessoa_email       text,

  entregas           integer NOT NULL,
  facil              integer NOT NULL DEFAULT 0,
  media              integer NOT NULL DEFAULT 0,
  dificil            integer NOT NULL DEFAULT 0,
  pontos             integer NOT NULL,

  -- Só na linha da equipe: a meta é do conjunto, não de cada um.
  meta_pontos        integer,
  percentual         numeric(9,4),
  faixa_id           uuid,
  faixa_rotulo       text,
  -- NULL com `faixa_indefinida = true` significa "o RH não definiu quanto
  -- vale". NULL não é zero, e a coluna não tem DEFAULT 0 de propósito.
  valor_reais        numeric(12,2),
  faixa_indefinida   boolean NOT NULL DEFAULT false,

  congelado_em       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rcr_chave UNIQUE NULLS NOT DISTINCT (ciclo_id, pessoa_id),
  CONSTRAINT rcr_valor_exige_faixa
    CHECK (valor_reais IS NULL OR faixa_id IS NOT NULL),
  -- Faixa indefinida e valor preenchido é contradição: se o RH não definiu,
  -- não pode haver número.
  CONSTRAINT rcr_indefinida_sem_valor
    CHECK (NOT faixa_indefinida OR valor_reais IS NULL)
);

ALTER TABLE public.relatorio_ciclo_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_ciclo_resultado ENABLE ROW LEVEL SECURITY;

-- SÓ SELECT. A imutabilidade não depende de RLS: sem GRANT de UPDATE ou
-- DELETE, nem policy poderia liberar. Escrita exclusivamente pelas RPCs.
GRANT SELECT ON public.relatorio_ciclo_item      TO authenticated;
GRANT SELECT ON public.relatorio_ciclo_resultado TO authenticated;
GRANT ALL    ON public.relatorio_ciclo_item      TO service_role;
GRANT ALL    ON public.relatorio_ciclo_resultado TO service_role;

DROP POLICY IF EXISTS relatorio_ciclo_item_select ON public.relatorio_ciclo_item;
CREATE POLICY relatorio_ciclo_item_select ON public.relatorio_ciclo_item
  FOR SELECT TO authenticated
  USING (public.pode_ver_remuneracao_de(pessoa_id));

-- A linha da equipe (`pessoa_id IS NULL`) exige ver a de todos: ela é a soma
-- de todo mundo, então revelá-la a quem só pode ver a própria seria contorno.
DROP POLICY IF EXISTS relatorio_ciclo_resultado_select ON public.relatorio_ciclo_resultado;
CREATE POLICY relatorio_ciclo_resultado_select ON public.relatorio_ciclo_resultado
  FOR SELECT TO authenticated
  USING (
    CASE WHEN pessoa_id IS NULL
         THEN public.tem_capacidade('remuneracao.ver_todas')
         ELSE public.pode_ver_remuneracao_de(pessoa_id)
    END
  );

-- Nem a própria RPC pode reescrever ciclo aprovado.
CREATE OR REPLACE FUNCTION public.trg_relatorio_snapshot_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_situacao text;
BEGIN
  SELECT situacao INTO v_situacao FROM public.relatorio_ciclo
   WHERE id = coalesce(NEW.ciclo_id, OLD.ciclo_id);
  IF v_situacao = 'aprovado' THEN
    RAISE EXCEPTION 'O ciclo já foi aprovado. O resultado não pode mais mudar.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS relatorio_ciclo_item_imutavel ON public.relatorio_ciclo_item;
CREATE TRIGGER relatorio_ciclo_item_imutavel
  BEFORE INSERT OR UPDATE OR DELETE ON public.relatorio_ciclo_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_relatorio_snapshot_imutavel();

DROP TRIGGER IF EXISTS relatorio_ciclo_resultado_imutavel ON public.relatorio_ciclo_resultado;
CREATE TRIGGER relatorio_ciclo_resultado_imutavel
  BEFORE INSERT OR UPDATE OR DELETE ON public.relatorio_ciclo_resultado
  FOR EACH ROW EXECUTE FUNCTION public.trg_relatorio_snapshot_imutavel();

REVOKE ALL ON FUNCTION public.trg_relatorio_snapshot_imutavel()
  FROM PUBLIC, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3. O RESULTADO DO CICLO — a função que a tela consome
-- ---------------------------------------------------------------------------
--
-- Ciclo aberto ou em análise: calcula ao vivo.
-- Ciclo fechado ou aprovado: lê o snapshot.
--
-- Duas fontes de propósito, e a `situacao` escolhe. É como folha de pagamento
-- funciona: prévia enquanto está aberto, documento depois de fechado.

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
  v_pct    numeric;
  v_faixa       public.relatorio_faixa;
  v_faixa_rot   text;
  v_faixa_valor numeric;
  v_indef       boolean;
BEGIN
  IF NOT (public.tem_capacidade('remuneracao.ver_todas')
          OR public.tem_capacidade('remuneracao.ver_propria')) THEN
    RAISE EXCEPTION 'Sem permissão para ver a apuração.'
      USING HINT = 'É preciso uma capacidade de remuneração.';
  END IF;

  SELECT * INTO c FROM public.relatorio_ciclo WHERE id = _ciclo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo não encontrado.'; END IF;

  IF c.situacao IN ('fechado', 'aprovado') THEN
    -- Congelado: devolve o que foi apurado, não o que seria hoje.
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
           THEN 'Faixa de remuneração não definida'
           ELSE coalesce(v_faixa_rot, '') END;
    RETURN;
  END IF;

  -- Aberto: soma ao vivo. Só entra o que tem data confirmada, fechamento
  -- registrado e classificação — as três condições da elegibilidade.
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

  v_pct := CASE WHEN c.meta_pontos > 0
                THEN round(100.0 * v_pontos / c.meta_pontos, 4)
                ELSE 0 END;

  SELECT * INTO v_faixa FROM public.relatorio_faixa_para(v_pct, c.inicio::date);

  -- As duas situações que a tela precisa tratar igual: não achou faixa, e
  -- achou faixa sem valor. Nas duas, nenhum número em reais pode aparecer.
  v_indef := (v_faixa.id IS NULL) OR (v_faixa.valor_reais IS NULL);

  RETURN QUERY SELECT
    c.rotulo, c.inicio, c.fim, c.situacao, false,
    c.meta_pontos, v_pontos, v_pct,
    v_ent::integer, v_f::integer, v_m::integer, v_d::integer,
    v_faixa.rotulo,
    CASE WHEN v_indef THEN NULL ELSE v_faixa.valor_reais END,
    v_indef,
    CASE WHEN v_indef THEN 'Faixa de remuneração não definida'
         ELSE coalesce(v_faixa.rotulo, '') END;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_resultado_do_ciclo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_resultado_do_ciclo(uuid)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 4. FECHAR O CICLO
-- ---------------------------------------------------------------------------

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
    RAISE EXCEPTION 'Sem permissão para fechar ciclo.'
      USING HINT = 'É preciso a capacidade remuneracao.administrar.';
  END IF;

  SELECT * INTO c FROM public.relatorio_ciclo WHERE id = _ciclo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo não encontrado.'; END IF;
  IF c.situacao IN ('fechado', 'aprovado') THEN
    RAISE EXCEPTION 'O ciclo % já está %.', c.rotulo, c.situacao;
  END IF;

  -- Congela item por item, copiando tudo. Nenhum join sobrevive ao
  -- fechamento: título, nome e pontos vão gravados.
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

  SELECT count(*) INTO v_n FROM public.relatorio_ciclo_item WHERE ciclo_id = _ciclo_id;

  -- Uma linha por pessoa.
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

  -- E a linha da equipe, com meta, percentual e faixa.
  SELECT coalesce(sum(pontos), 0) INTO v_pontos
    FROM public.relatorio_ciclo_item WHERE ciclo_id = _ciclo_id;

  v_pct := CASE WHEN c.meta_pontos > 0
                THEN round(100.0 * v_pontos / c.meta_pontos, 4) ELSE 0 END;

  SELECT * INTO v_faixa FROM public.relatorio_faixa_para(v_pct, c.inicio::date);
  v_indef := (v_faixa.id IS NULL) OR (v_faixa.valor_reais IS NULL);

  INSERT INTO public.relatorio_ciclo_resultado
    (ciclo_id, pessoa_id, entregas, facil, media, dificil, pontos,
     meta_pontos, percentual, faixa_id, faixa_rotulo, valor_reais, faixa_indefinida)
  SELECT
    _ciclo_id, NULL,
    count(*)::integer,
    count(*) FILTER (WHERE classificacao = 'facil')::integer,
    count(*) FILTER (WHERE classificacao = 'media')::integer,
    count(*) FILTER (WHERE classificacao = 'dificil')::integer,
    coalesce(sum(pontos), 0)::integer,
    c.meta_pontos, v_pct,
    v_faixa.id, v_faixa.rotulo,
    -- Faixa indefinida fecha com valor NULO. O ciclo é apurado, o número de
    -- pontos é definitivo, e o valor fica pendente do RH — em vez de o
    -- fechamento travar ou de alguém "arredondar" para a faixa vizinha.
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
-- 5. REABRIR — só antes da aprovação, e com motivo
-- ---------------------------------------------------------------------------
--
-- A coluna vem ANTES da função que a usa. plpgsql resolve nome de coluna só
-- na primeira execução, então criar a função antes passaria sem erro — e
-- estouraria na primeira reabertura, longe da causa.

ALTER TABLE public.relatorio_ciclo
  ADD COLUMN IF NOT EXISTS observacoes text;
-- Depois de aprovado não reabre: correção posterior é ajuste registrado, não
-- reescrita de documento assinado.

CREATE OR REPLACE FUNCTION public.relatorio_reabrir_ciclo(_ciclo_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c public.relatorio_ciclo;
BEGIN
  IF NOT public.tem_capacidade('remuneracao.administrar') THEN
    RAISE EXCEPTION 'Sem permissão para reabrir ciclo.';
  END IF;
  IF length(btrim(coalesce(_motivo, ''))) < 10 THEN
    RAISE EXCEPTION 'Reabrir um ciclo exige motivo registrado.';
  END IF;

  SELECT * INTO c FROM public.relatorio_ciclo WHERE id = _ciclo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo não encontrado.'; END IF;
  IF c.situacao = 'aprovado' THEN
    RAISE EXCEPTION 'O ciclo % foi aprovado e não pode ser reaberto.', c.rotulo;
  END IF;
  IF c.situacao <> 'fechado' THEN
    RAISE EXCEPTION 'O ciclo % não está fechado.', c.rotulo;
  END IF;

  DELETE FROM public.relatorio_ciclo_resultado WHERE ciclo_id = _ciclo_id;
  DELETE FROM public.relatorio_ciclo_item      WHERE ciclo_id = _ciclo_id;

  UPDATE public.relatorio_ciclo
     SET situacao    = 'em_analise',
         fechado_por = NULL,
         fechado_em  = NULL,
         observacoes = concat_ws(E'\n',
           observacoes,
           format('Reaberto em %s por %s: %s',
                  to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
                  coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), 'desconhecido'),
                  btrim(_motivo)))
   WHERE id = _ciclo_id;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_reabrir_ciclo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_reabrir_ciclo(uuid, text)
  TO authenticated, service_role;
