-- ===========================================================================
-- ETAPA 3 — FECHAMENTO TÉCNICO, TEMPO E CLASSIFICAÇÃO
-- ===========================================================================
--
-- Três regras de negócio que ficam no BANCO, não na tela:
--
--   1. Concluir a demanda NÃO exige fechamento técnico. A entrega vale, e
--      entra na fila de pendências até alguém registrar. Fechamento é
--      requisito para CLASSIFICAR, não para concluir.
--
--   2. Ninguém classifica a própria entrega.
--
--   3. Classificar exige justificativa escrita. Não existe caminho que
--      grave classificação sem ela, e não existe caminho que altere sem
--      deixar histórico.
--
-- E uma regra que o banco NÃO pode garantir, mas a tela precisa dizer:
-- tempo é informação de apoio, nunca fórmula. Nada aqui calcula
-- Fácil/Médio/Difícil a partir de horas. E usar IA para construir algo
-- complexo não torna a atividade fácil.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. FECHAMENTO TÉCNICO
-- ---------------------------------------------------------------------------
--
-- Chave primária É a chave estrangeira: um fechamento por demanda,
-- garantido pela estrutura, sem UNIQUE extra.
--
-- Todos os campos narrativos aceitam nulo, de propósito. "Não informado." é
-- decisão de exibição, não dado — e o gatilho abaixo normaliza texto vazio
-- para nulo, para que exista UM estado de ausência em vez de três (`''`,
-- `'  '` e `NULL`) significando a mesma coisa em três lugares da interface.

CREATE TABLE IF NOT EXISTS public.relatorio_fechamento_tecnico (
  demanda_id  uuid PRIMARY KEY REFERENCES public.demands(id) ON DELETE CASCADE,

  -- Copiado da demanda no primeiro salvamento, e editável depois. É CÓPIA e
  -- não consulta: `demands.title` e `description` podem ser corrigidos meses
  -- adiante, e relatório histórico que muda sozinho não é histórico.
  o_que_foi_solicitado          text,

  problema_identificado         text,
  solucao_implementada          text,
  o_que_foi_alterado            text,
  sistemas_afetados             text[] NOT NULL DEFAULT '{}',
  funcionalidades_implementadas text,
  integracoes_realizadas        text,
  banco_alterado                text,
  seguranca_rls                 text,
  testes_realizados             text,
  resultado_obtido              text,
  observacoes                   text,
  evidencias_links              text[] NOT NULL DEFAULT '{}',

  -- Datas DECLARADAS pelo desenvolvedor. Não confundir com
  -- `relatorio_conclusao.data_conclusao`, que é a data com procedência e é a
  -- autoridade da apuração. Esta aqui é parte do relato técnico.
  data_inicio                   date,
  data_conclusao_declarada      date,

  situacao       text NOT NULL DEFAULT 'rascunho',

  -- CHECK de um único valor: é a expressão em schema de "IA jamais preenche".
  -- Qualquer código futuro que tente marcar 'ia' falha alto, com nome de
  -- constraint legível, em vez de passar despercebido.
  origem         text NOT NULL DEFAULT 'humano',

  preenchido_por       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  preenchido_por_email text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rft_origem_humana CHECK (origem = 'humano'),
  CONSTRAINT rft_situacao_valida CHECK (situacao IN ('rascunho', 'concluido')),
  CONSTRAINT rft_datas_coerentes
    CHECK (data_conclusao_declarada IS NULL OR data_inicio IS NULL
           OR data_conclusao_declarada >= data_inicio),
  CONSTRAINT rft_sistemas_sem_nulo   CHECK (array_position(sistemas_afetados, NULL) IS NULL),
  CONSTRAINT rft_evidencias_sem_nulo CHECK (array_position(evidencias_links, NULL) IS NULL),

  -- O PORTÃO PARA A CLASSIFICAÇÃO.
  --
  -- Marcar como 'concluido' exige os quatro campos que fazem o relatório ter
  -- sentido para quem não participou: qual era o problema, o que foi feito, o
  -- que mudou, e no que deu. Sem eles, o registro é uma casca.
  --
  -- Os outros campos seguem opcionais porque não se aplicam sempre — nem toda
  -- entrega mexe em banco, integração ou RLS, e exigir texto onde não houve
  -- alteração só produziria "não se aplica" digitado 40 vezes.
  CONSTRAINT rft_concluido_exige_essencial CHECK (
    situacao <> 'concluido'
    OR (length(btrim(coalesce(problema_identificado, ''))) > 0
    AND length(btrim(coalesce(solucao_implementada,  ''))) > 0
    AND length(btrim(coalesce(o_que_foi_alterado,    ''))) > 0
    AND length(btrim(coalesce(resultado_obtido,      ''))) > 0)
  )
);

CREATE INDEX IF NOT EXISTS relatorio_fechamento_situacao
  ON public.relatorio_fechamento_tecnico (situacao);
CREATE INDEX IF NOT EXISTS relatorio_fechamento_sistemas
  ON public.relatorio_fechamento_tecnico USING gin (sistemas_afetados);

-- Texto vazio e espaço em branco viram nulo. Um estado de ausência, não três.
CREATE OR REPLACE FUNCTION public.trg_relatorio_fechamento_normaliza()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.o_que_foi_solicitado          := nullif(btrim(coalesce(NEW.o_que_foi_solicitado, '')), '');
  NEW.problema_identificado         := nullif(btrim(coalesce(NEW.problema_identificado, '')), '');
  NEW.solucao_implementada          := nullif(btrim(coalesce(NEW.solucao_implementada, '')), '');
  NEW.o_que_foi_alterado            := nullif(btrim(coalesce(NEW.o_que_foi_alterado, '')), '');
  NEW.funcionalidades_implementadas := nullif(btrim(coalesce(NEW.funcionalidades_implementadas, '')), '');
  NEW.integracoes_realizadas        := nullif(btrim(coalesce(NEW.integracoes_realizadas, '')), '');
  NEW.banco_alterado                := nullif(btrim(coalesce(NEW.banco_alterado, '')), '');
  NEW.seguranca_rls                 := nullif(btrim(coalesce(NEW.seguranca_rls, '')), '');
  NEW.testes_realizados             := nullif(btrim(coalesce(NEW.testes_realizados, '')), '');
  NEW.resultado_obtido              := nullif(btrim(coalesce(NEW.resultado_obtido, '')), '');
  NEW.observacoes                   := nullif(btrim(coalesce(NEW.observacoes, '')), '');
  NEW.updated_at                    := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS relatorio_fechamento_normaliza ON public.relatorio_fechamento_tecnico;
CREATE TRIGGER relatorio_fechamento_normaliza
  BEFORE INSERT OR UPDATE ON public.relatorio_fechamento_tecnico
  FOR EACH ROW EXECUTE FUNCTION public.trg_relatorio_fechamento_normaliza();

ALTER TABLE public.relatorio_fechamento_tecnico ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.relatorio_fechamento_tecnico TO authenticated;
-- SEM grant a `service_role`, quebrando a convenção do projeto de propósito:
-- as edge functions de IA rodam com service role e a RLS não as alcança. O
-- CHECK `origem = 'humano'` é o alarme; a ausência deste grant é a tranca.
-- Consequência aceita: nenhuma function pode preencher isto em lote.

DROP POLICY IF EXISTS relatorio_fechamento_select ON public.relatorio_fechamento_tecnico;
CREATE POLICY relatorio_fechamento_select ON public.relatorio_fechamento_tecnico
  FOR SELECT TO authenticated
  USING (public.is_equipe() OR public.tem_capacidade('relatorios.ver'));

-- Quem escreve é a equipe. O RH lê e classifica, mas não redige o relato
-- técnico de outra pessoa.
DROP POLICY IF EXISTS relatorio_fechamento_insert ON public.relatorio_fechamento_tecnico;
CREATE POLICY relatorio_fechamento_insert ON public.relatorio_fechamento_tecnico
  FOR INSERT TO authenticated
  WITH CHECK (public.is_equipe());

DROP POLICY IF EXISTS relatorio_fechamento_update ON public.relatorio_fechamento_tecnico;
CREATE POLICY relatorio_fechamento_update ON public.relatorio_fechamento_tecnico
  FOR UPDATE TO authenticated
  USING (public.is_equipe())
  WITH CHECK (public.is_equipe());


-- ---------------------------------------------------------------------------
-- 2. TEMPO — INFORMAÇÃO DE APOIO, NUNCA FÓRMULA
-- ---------------------------------------------------------------------------
--
-- Intervalos separados porque trabalho real não é contínuo: três horas numa
-- terça e duas numa quarta são cinco horas, e `created_at → conclusão` seria
-- doze dias — que incluem espera, revisão, bloqueio e outras demandas.
--
-- NADA NO SISTEMA DERIVA CLASSIFICAÇÃO DISTO. Por decisão explícita do RH em
-- 21/08/2026, o tempo aparece na tela de quem classifica como contexto, ao
-- lado de escopo, impacto e risco — e nenhuma consulta o transforma em pontos.

CREATE TABLE IF NOT EXISTS public.relatorio_intervalo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id     uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  pessoa_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  inicio         timestamptz NOT NULL,
  fim            timestamptz NOT NULL,
  observacao     text,
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ri_ordem_das_pontas CHECK (fim > inicio),
  -- Um intervalo de mais de 16 horas é quase sempre erro de digitação de
  -- data, não uma jornada. Barrar aqui evita que um zero a mais vire
  -- "trabalhou 400 horas" num relatório que vai para o RH.
  CONSTRAINT ri_duracao_plausivel CHECK (fim - inicio <= INTERVAL '16 hours')

  -- NÃO existe constraint barrando data futura, e não é esquecimento.
  --
  -- Ela precisaria de `now()`, e função volátil em CHECK é armadilha de
  -- restauração: o Postgres reavalia a constraint ao restaurar um backup, com
  -- um `now()` diferente do original, e uma linha perfeitamente válida passa
  -- a violar — o restore falha inteiro. Custaria um dia de trabalho para
  -- descobrir a causa, no pior momento possível.
  --
  -- A validação de data futura fica na interface, onde errar não corrompe
  -- backup.
);

CREATE INDEX IF NOT EXISTS relatorio_intervalo_demanda
  ON public.relatorio_intervalo (demanda_id, inicio);
CREATE INDEX IF NOT EXISTS relatorio_intervalo_pessoa
  ON public.relatorio_intervalo (pessoa_id, inicio DESC);

ALTER TABLE public.relatorio_intervalo ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_intervalo TO authenticated;
GRANT ALL ON public.relatorio_intervalo TO service_role;

DROP POLICY IF EXISTS relatorio_intervalo_select ON public.relatorio_intervalo;
CREATE POLICY relatorio_intervalo_select ON public.relatorio_intervalo
  FOR SELECT TO authenticated
  USING (pessoa_id = auth.uid()
      OR public.is_equipe()
      OR public.tem_capacidade('relatorios.ver'));

-- Cada um lança as PRÓPRIAS horas. Ninguém registra tempo no nome de outro —
-- nem administrador, nem RH. É a única forma de o número significar algo.
DROP POLICY IF EXISTS relatorio_intervalo_insert ON public.relatorio_intervalo;
CREATE POLICY relatorio_intervalo_insert ON public.relatorio_intervalo
  FOR INSERT TO authenticated
  WITH CHECK (pessoa_id = auth.uid() AND public.is_equipe());

DROP POLICY IF EXISTS relatorio_intervalo_update ON public.relatorio_intervalo;
CREATE POLICY relatorio_intervalo_update ON public.relatorio_intervalo
  FOR UPDATE TO authenticated
  USING (pessoa_id = auth.uid()) WITH CHECK (pessoa_id = auth.uid());

DROP POLICY IF EXISTS relatorio_intervalo_delete ON public.relatorio_intervalo;
CREATE POLICY relatorio_intervalo_delete ON public.relatorio_intervalo
  FOR DELETE TO authenticated
  USING (pessoa_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 3. CLASSIFICAÇÃO — com justificativa obrigatória
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.relatorio_classificacao (
  demanda_id     uuid PRIMARY KEY REFERENCES public.demands(id) ON DELETE CASCADE,
  classificacao  text NOT NULL REFERENCES public.relatorio_classificacao_tipo(codigo),

  -- Pontos COPIADOS no momento da decisão, não lidos por join. Se a escala
  -- mudar de 100 para 120 em janeiro, o que foi classificado em agosto
  -- continua valendo 100.
  pontos         integer NOT NULL,

  justificativa  text NOT NULL,

  definido_por       uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  definido_por_email text,
  definido_em        timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rc_pontos_positivos CHECK (pontos > 0),
  -- Justificativa curta é justificativa ausente com aparência de presente.
  CONSTRAINT rc_justificativa_substantiva CHECK (length(btrim(justificativa)) >= 15)
);

CREATE INDEX IF NOT EXISTS relatorio_classificacao_por_tipo
  ON public.relatorio_classificacao (classificacao);

ALTER TABLE public.relatorio_classificacao ENABLE ROW LEVEL SECURITY;
-- Só SELECT para `authenticated`. Escrita exclusivamente pela RPC abaixo, que
-- é o único lugar onde as três regras (capacidade, não-autoclassificação,
-- histórico) são aplicadas juntas e na mesma transação.
GRANT SELECT ON public.relatorio_classificacao TO authenticated;
GRANT ALL ON public.relatorio_classificacao TO service_role;

DROP POLICY IF EXISTS relatorio_classificacao_select ON public.relatorio_classificacao;
CREATE POLICY relatorio_classificacao_select ON public.relatorio_classificacao
  FOR SELECT TO authenticated
  USING (public.is_equipe() OR public.tem_capacidade('relatorios.ver'));


-- ---------------------------------------------------------------------------
-- 4. HISTÓRICO DA CLASSIFICAÇÃO
-- ---------------------------------------------------------------------------
--
-- Por que não reaproveitar `demand_audit_logs`: a policy de SELECT dele
-- inclui `can_view_demand()`, que inclui o SOLICITANTE. Guardar pontuação ali
-- exporia dado de remuneração a quem abriu o chamado, através de uma política
-- escrita para visibilidade de atendimento. Além disso o formato
-- (field_name, old_value, new_value) não tem lugar para justificativa.

CREATE TABLE IF NOT EXISTS public.relatorio_classificacao_historico (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id            uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  origem                text NOT NULL,

  classificacao_de      text,
  classificacao_para    text NOT NULL,
  pontos_de             integer,
  pontos_para           integer NOT NULL,

  justificativa         text NOT NULL,
  -- Só na ALTERAÇÃO: por que mudou de opinião. Na primeira definição não
  -- existe mudança, então não há o que justificar além da justificativa.
  motivo_da_alteracao   text,

  alterado_por          uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Sobrevive à exclusão do usuário, ao contrário de `demand_audit_logs`.
  alterado_por_email    text,
  alterado_em           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rch_origem_valida CHECK (origem IN ('definicao', 'alteracao')),
  CONSTRAINT rch_alteracao_exige_motivo CHECK (
    origem = 'definicao'
    OR length(btrim(coalesce(motivo_da_alteracao, ''))) >= 10
  )
);

CREATE INDEX IF NOT EXISTS relatorio_classificacao_hist_demanda
  ON public.relatorio_classificacao_historico (demanda_id, alterado_em DESC);

ALTER TABLE public.relatorio_classificacao_historico ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.relatorio_classificacao_historico TO authenticated;
GRANT ALL ON public.relatorio_classificacao_historico TO service_role;

DROP POLICY IF EXISTS relatorio_classificacao_hist_select ON public.relatorio_classificacao_historico;
CREATE POLICY relatorio_classificacao_hist_select ON public.relatorio_classificacao_historico
  FOR SELECT TO authenticated
  USING (public.is_equipe() OR public.tem_capacidade('relatorios.ver'));


-- ---------------------------------------------------------------------------
-- 5. A RPC QUE CLASSIFICA
-- ---------------------------------------------------------------------------
--
-- Único caminho de escrita. Não existe como classificar sem passar por aqui,
-- e não existe como passar por aqui sem gravar histórico.

CREATE OR REPLACE FUNCTION public.relatorio_classificar(
  _demanda_id    uuid,
  _classificacao text,
  _justificativa text,
  _motivo        text DEFAULT NULL
)
RETURNS public.relatorio_classificacao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_email      text;
  v_pontos     integer;
  v_anterior   public.relatorio_classificacao;
  v_responsavel uuid;
  v_fechado    boolean;
  v_saida      public.relatorio_classificacao;
BEGIN
  IF NOT public.tem_capacidade('classificacao.definir') THEN
    RAISE EXCEPTION 'Sem permissão para classificar.'
      USING HINT = 'É preciso a capacidade classificacao.definir.';
  END IF;

  SELECT d.assigned_to INTO v_responsavel
    FROM public.demands d WHERE d.id = _demanda_id AND d.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada.';
  END IF;

  -- NINGUÉM CLASSIFICA A PRÓPRIA ENTREGA.
  -- Não é desconfiança: é que a pontuação vira dinheiro, e quem executou não
  -- pode ser quem decide quanto o próprio trabalho valeu. Vale inclusive para
  -- administrador — não há exceção por cargo.
  IF v_responsavel IS NOT NULL AND v_responsavel = v_uid THEN
    RAISE EXCEPTION 'Você não pode classificar uma demanda da qual é responsável.'
      USING HINT = 'Peça a outra pessoa com a capacidade classificacao.definir.';
  END IF;

  -- O fechamento técnico precisa estar concluído. Concluir a DEMANDA não
  -- exige isso — mas classificar exige, porque sem o relato não há base para
  -- julgar escopo, impacto ou risco.
  SELECT (f.situacao = 'concluido') INTO v_fechado
    FROM public.relatorio_fechamento_tecnico f WHERE f.demanda_id = _demanda_id;
  IF coalesce(v_fechado, false) = false THEN
    RAISE EXCEPTION 'O fechamento técnico desta demanda ainda não foi concluído.'
      USING HINT = 'O responsável precisa registrar problema, solução, alterações e resultado.';
  END IF;

  SELECT t.pontos INTO v_pontos
    FROM public.relatorio_classificacao_tipo t
   WHERE t.codigo = _classificacao AND t.ativo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Classificação inválida ou inativa: %', _classificacao;
  END IF;

  IF length(btrim(coalesce(_justificativa, ''))) < 15 THEN
    RAISE EXCEPTION 'A justificativa é obrigatória e precisa explicar a decisão.'
      USING HINT = 'Diga por que o escopo, o impacto ou o risco levam a esta classificação.';
  END IF;

  SELECT * INTO v_anterior FROM public.relatorio_classificacao
   WHERE demanda_id = _demanda_id;

  -- Alterar exige motivo além da justificativa: um diz por que É isto, o
  -- outro diz por que DEIXOU DE SER aquilo.
  IF FOUND AND length(btrim(coalesce(_motivo, ''))) < 10 THEN
    RAISE EXCEPTION 'Alterar uma classificação existente exige o motivo da mudança.'
      USING HINT = format('Hoje está %s. Explique o que mudou no entendimento.',
                          v_anterior.classificacao);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.relatorio_classificacao AS rc
    (demanda_id, classificacao, pontos, justificativa,
     definido_por, definido_por_email)
  VALUES
    (_demanda_id, _classificacao, v_pontos, btrim(_justificativa), v_uid, v_email)
  ON CONFLICT (demanda_id) DO UPDATE SET
    classificacao      = EXCLUDED.classificacao,
    pontos             = EXCLUDED.pontos,
    justificativa      = EXCLUDED.justificativa,
    definido_por       = EXCLUDED.definido_por,
    definido_por_email = EXCLUDED.definido_por_email,
    definido_em        = now(),
    updated_at         = now()
  RETURNING rc.* INTO v_saida;

  INSERT INTO public.relatorio_classificacao_historico
    (demanda_id, origem,
     classificacao_de, classificacao_para, pontos_de, pontos_para,
     justificativa, motivo_da_alteracao, alterado_por, alterado_por_email)
  VALUES
    (_demanda_id,
     CASE WHEN v_anterior.demanda_id IS NULL THEN 'definicao' ELSE 'alteracao' END,
     v_anterior.classificacao, _classificacao,
     v_anterior.pontos, v_pontos,
     btrim(_justificativa),
     CASE WHEN v_anterior.demanda_id IS NULL THEN NULL ELSE btrim(_motivo) END,
     v_uid, v_email);

  RETURN v_saida;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_classificar(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_classificar(uuid, text, text, text)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 6. A FILA DE PENDÊNCIAS
-- ---------------------------------------------------------------------------
--
-- O que está concluído e ainda não tem relato técnico fechado. É a lista de
-- trabalho que o dia 19 vai cobrar — e existir como consulta, e não como
-- bloqueio na conclusão, é justamente a decisão de não travar o fluxo.

CREATE OR REPLACE FUNCTION public.relatorio_pendencias_de_fechamento(
  _pessoa uuid DEFAULT NULL
)
RETURNS TABLE (
  demanda_id       uuid,
  ticket_code      text,
  titulo           text,
  sistema_slug     text,
  responsavel_id   uuid,
  responsavel_nome text,
  concluida_em     timestamptz,
  dias_parada      integer,
  situacao         text,
  minutos_lancados integer,
  no_ciclo_aberto  boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.is_equipe() OR public.tem_capacidade('relatorios.ver')) THEN
    RAISE EXCEPTION 'Sem permissão para ver as pendências.';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.ticket_code,
    d.title,
    d.sistema_slug,
    d.assigned_to,
    p.nome,
    rc.data_conclusao,
    EXTRACT(DAY FROM (now() - rc.data_conclusao))::integer,
    coalesce(f.situacao, 'sem_registro'),
    coalesce(iv.minutos, 0)::integer,
    EXISTS (
      SELECT 1 FROM public.relatorio_ciclo c
       WHERE rc.data_conclusao >= c.inicio AND rc.data_conclusao < c.fim
         AND c.situacao IN ('aberto', 'em_analise')
    )
  FROM public.demands d
  JOIN public.relatorio_conclusao rc ON rc.demanda_id = d.id
  LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
  LEFT JOIN public.profiles p ON p.id = d.assigned_to
  LEFT JOIN LATERAL (
    SELECT sum(EXTRACT(EPOCH FROM (i.fim - i.inicio)) / 60) AS minutos
      FROM public.relatorio_intervalo i WHERE i.demanda_id = d.id
  ) iv ON true
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    AND rc.procedencia = 'confirmada'
    AND coalesce(f.situacao, 'sem_registro') <> 'concluido'
    AND (_pessoa IS NULL OR d.assigned_to = _pessoa)
  ORDER BY rc.data_conclusao DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_pendencias_de_fechamento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_pendencias_de_fechamento(uuid)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 7. O QUE ESTÁ PRONTO PARA CLASSIFICAR
-- ---------------------------------------------------------------------------
-- Fechamento concluído e ainda sem classificação. A outra ponta da fila.

CREATE OR REPLACE FUNCTION public.relatorio_pendencias_de_classificacao()
RETURNS TABLE (
  demanda_id       uuid,
  ticket_code      text,
  titulo           text,
  sistema_slug     text,
  responsavel_id   uuid,
  responsavel_nome text,
  concluida_em     timestamptz,
  minutos_lancados integer,
  problema         text,
  solucao          text,
  alterado         text,
  resultado        text,
  testes           text,
  tarefas_feitas   integer,
  tarefas_total    integer,
  anexos           integer,
  ja_classificada  boolean
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
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  RETURN QUERY
  SELECT
    d.id, d.ticket_code, d.title, d.sistema_slug,
    d.assigned_to, p.nome,
    rc.data_conclusao,
    coalesce(iv.minutos, 0)::integer,
    f.problema_identificado,
    f.solucao_implementada,
    f.o_que_foi_alterado,
    f.resultado_obtido,
    f.testes_realizados,
    coalesce(t.feitas, 0)::integer,
    coalesce(t.total, 0)::integer,
    coalesce(a.n, 0)::integer,
    (cl.demanda_id IS NOT NULL)
  FROM public.demands d
  JOIN public.relatorio_conclusao rc ON rc.demanda_id = d.id
  JOIN public.relatorio_fechamento_tecnico f
       ON f.demanda_id = d.id AND f.situacao = 'concluido'
  LEFT JOIN public.relatorio_classificacao cl ON cl.demanda_id = d.id
  LEFT JOIN public.profiles p ON p.id = d.assigned_to
  LEFT JOIN LATERAL (
    SELECT sum(EXTRACT(EPOCH FROM (i.fim - i.inicio)) / 60) AS minutos
      FROM public.relatorio_intervalo i WHERE i.demanda_id = d.id
  ) iv ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS total, count(*) FILTER (WHERE completed) AS feitas
      FROM public.demand_tasks WHERE demand_id = d.id
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_attachments WHERE demand_id = d.id
  ) a ON true
  WHERE d.deleted_at IS NULL AND rc.procedencia = 'confirmada'
  ORDER BY (cl.demanda_id IS NOT NULL), rc.data_conclusao DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_pendencias_de_classificacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_pendencias_de_classificacao()
  TO authenticated, service_role;
