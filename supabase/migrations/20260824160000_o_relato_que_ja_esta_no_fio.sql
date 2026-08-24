-- ===========================================================================
-- O RELATO QUE JÁ ESTÁ NO FIO
-- ===========================================================================
--
-- TRÊS SINTOMAS, UMA CAUSA
--
-- 1. "em classificação não tem nenhuma lá" — 46 demandas concluídas, a fila
--    mostrava 1.
-- 2. "o relatório precisa ter a descrição de como foi feita e resolvida a
--    demanda, não tem lá".
-- 3. "os dados precisam vir preenchidos já, pois já enviamos a resolução no
--    chat".
--
-- A causa dos dois primeiros é a mesma: o fechamento técnico é o único lugar
-- onde mora o relato do que foi feito, e ele está vazio em 45 das 46. A fila
-- de classificação fazia INNER JOIN nele, então demanda sem fechamento
-- simplesmente não existia para a tela. E o relatório devolvia `fechamento`
-- como estado ('sem_registro' | 'rascunho' | 'concluido') sem nunca devolver
-- o texto — ou seja, mesmo nas que tinham relato, a tela não tinha o dado
-- para mostrar.
--
-- O terceiro sintoma é o diagnóstico do primeiro. O relato não está vazio: ele
-- está no fio da demanda, escrito pela equipe, no dia em que o trabalho foi
-- feito. O que faltava não era a informação — era ela estar onde o formulário
-- lê.
--
-- O QUE ESTA MIGRATION NÃO FAZ
--
-- Não preenche fechamento nenhum. Não escreve em `relatorio_fechamento_tecnico`
-- nem em `demands`. Nenhum UPDATE em massa, nenhum dado histórico alterado.
-- Ela só cria uma LEITURA que devolve o que a equipe escreveu, para o
-- formulário oferecer como sugestão. Quem confirma é pessoa, uma demanda por
-- vez, e o campo só existe depois que alguém salvou.
--
-- Isso mantém `origem = 'humano'` verdadeiro: o texto é humano na origem
-- (alguém digitou no fio) e humano na confirmação (alguém revisou e salvou).
-- A única coisa que a máquina faz é ir buscar.
--
-- POR QUE NÃO FILTRAR "MELHOR"
--
-- A tentação é adivinhar qual mensagem é a solução — descartar "vou ver isso
-- amanhã", "consegui", "deu erro". Não faço. Errar para menos custa uma linha
-- que a pessoa apaga; errar para mais esconde a resposta certa e ela nem sabe
-- que existia. A assimetria manda trazer demais e deixar a pessoa cortar.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A RESOLUÇÃO COMO ELA FOI ESCRITA
-- ---------------------------------------------------------------------------
/**
 * Devolve as últimas falas da EQUIPE no fio da demanda — as palavras de quem
 * fez o trabalho, na ordem em que foram ditas.
 *
 * O que fica fora, e por quê:
 *
 *   is_ai        — o Blink não é testemunha do que a equipe fez. Trazer texto
 *                  de IA para dentro do fechamento é exatamente o caminho pelo
 *                  qual invenção entra em relatório de remuneração.
 *   is_system    — "status alterado para concluído" não descreve nada.
 *   user_id = solicitante — o pedido não é o relato. O que o solicitante
 *                  escreveu já está em `descricao` e em `demanda_conversa`.
 *   texto curto  — "ok", "feito", "valeu" não sustentam classificação.
 *
 * O que fica DENTRO, e o cuidado que isso exige:
 *
 *   is_internal  — a nota interna entra, porque é onde o detalhe técnico
 *                  costuma estar de fato. Por isso esta função exige
 *                  `is_equipe()` e não aceita `relatorios.ver`: o RH tem
 *                  `relatorios.ver` e não pode ler nota interna.
 *
 *                  Consequência que precisa ser dita: se o dev aceitar uma
 *                  sugestão vinda de nota interna e salvar, aquele texto passa
 *                  a ser campo do fechamento, e o fechamento o RH lê. A nota
 *                  deixa de ser interna nesse momento. Isso é aceitável porque
 *                  exige um ato deliberado de uma pessoa que está vendo o
 *                  texto na tela — o que o sistema nunca faz sozinho.
 */
CREATE OR REPLACE FUNCTION public.relatorio_resolucao_do_fio(_demanda_id uuid)
RETURNS TABLE (
  comentario_id uuid,
  autor_nome    text,
  autor_email   text,
  escrito_em    timestamptz,
  interna       boolean,
  texto         text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_solicitante uuid;
BEGIN
  -- Só a equipe. Ver justificativa acima: o retorno pode conter nota interna.
  IF NOT public.is_equipe() THEN
    RAISE EXCEPTION 'Sem permissão para ler o fio desta demanda.'
      USING HINT = 'Apenas a equipe técnica.';
  END IF;

  SELECT d.created_by INTO v_solicitante
    FROM public.demands d
   WHERE d.id = _demanda_id AND d.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada.';
  END IF;

  RETURN QUERY
  WITH ultimas AS (
    SELECT c.id, c.user_id, c.created_at, c.is_internal, c.content
      FROM public.demand_comments c
     WHERE c.demand_id = _demanda_id
       AND NOT c.is_ai
       AND NOT c.is_system
       AND c.user_id IS NOT NULL
       AND c.user_id <> v_solicitante
       AND length(btrim(c.content)) > 15
     ORDER BY c.created_at DESC
     LIMIT 5
  )
  SELECT u.id, p.nome, p.email, u.created_at, u.is_internal, btrim(u.content)
    FROM ultimas u
    LEFT JOIN public.profiles p ON p.id = u.user_id
   -- LIMIT pegou as 5 mais recentes; aqui volta para ordem de leitura.
   ORDER BY u.created_at;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_resolucao_do_fio(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.relatorio_resolucao_do_fio(uuid) TO authenticated;

COMMENT ON FUNCTION public.relatorio_resolucao_do_fio(uuid) IS
  'Últimas falas da equipe no fio, para o formulário de fechamento oferecer como sugestão. Não escreve nada. Equipe apenas — pode conter nota interna.';


-- ---------------------------------------------------------------------------
-- 2. A FILA DE CLASSIFICAÇÃO PASSA A MOSTRAR O QUE FALTA
-- ---------------------------------------------------------------------------
/**
 * Uma troca: INNER JOIN em `relatorio_fechamento_tecnico` vira LEFT JOIN.
 *
 * O INNER JOIN não estava errado por acidente — ele codificava a regra "não se
 * classifica o que não está documentado", que continua valendo e continua
 * sendo cobrada por `relatorio_classificar()`. O erro foi de consequência: uma
 * fila que esconde o que falta fazer não parece rigorosa, parece quebrada. O
 * dev abria a tela, via uma linha, e concluía que o módulo não funcionava.
 *
 * Agora as 46 aparecem, cada uma dizendo em que pé está o fechamento. A trava
 * de classificar sem relato não mudou de lugar: ela está na RPC de escrita,
 * que é onde trava serve para algo.
 */

-- Acrescentar coluna a um `RETURNS TABLE` muda o tipo de retorno, e
-- `CREATE OR REPLACE` recusa isso. Precisa dropar. Conferido antes: nenhuma
-- view ou função depende destas duas, então não há CASCADE escondido.
DROP FUNCTION IF EXISTS public.relatorio_pendencias_de_classificacao();

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
  ja_classificada  boolean,
  classificacao    text,
  rotulo           text,
  pontos           integer,
  justificativa    text,
  classificada_por text,
  classificada_em  timestamptz,
  autoclassificada boolean,
  vezes_alterada   integer,
  -- NOVO: 'sem_registro' | 'rascunho' | 'concluido'. Sem isto a tela não tem
  -- como distinguir "pronta para classificar" de "falta escrever o relato".
  fechamento       text,
  -- NOVO: quantas falas da equipe existem no fio. É a dica de que o relato
  -- pode ser montado a partir do que já foi escrito, em vez de digitado de
  -- novo. Contagem apenas — o texto exige `is_equipe()` e sai pela função 1.
  falas_no_fio     integer
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
    rcl.data_conclusao,
    coalesce(iv.minutos, 0)::integer,
    f.problema_identificado,
    f.solucao_implementada,
    f.o_que_foi_alterado,
    f.resultado_obtido,
    f.testes_realizados,
    coalesce(t.feitas, 0)::integer,
    coalesce(t.total, 0)::integer,
    coalesce(a.n, 0)::integer,
    (cls.demanda_id IS NOT NULL),
    cls.classificacao,
    tipo.rotulo,
    cls.pontos,
    cls.justificativa,
    cls.definido_por_email,
    cls.definido_em,
    coalesce(cls.autoclassificada, false),
    coalesce(h.n, 0)::integer,
    coalesce(f.situacao, 'sem_registro'),
    coalesce(fio.n, 0)::integer
  FROM public.demands d
  JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  -- A troca. Era JOIN ... AND f.situacao = 'concluido'.
  LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao_tipo tipo ON tipo.codigo = cls.classificacao
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
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.relatorio_classificacao_historico hh
     WHERE hh.demanda_id = d.id AND hh.origem = 'alteracao'
  ) h ON true
  -- Mesmo predicado da função 1, para a contagem não prometer texto que ela
  -- não devolveria. Se um dos dois mudar, o outro tem de mudar junto.
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_comments c
     WHERE c.demand_id = d.id
       AND NOT c.is_ai AND NOT c.is_system
       AND c.user_id IS NOT NULL AND c.user_id <> d.created_by
       AND length(btrim(c.content)) > 15
  ) fio ON true
  WHERE d.deleted_at IS NULL AND rcl.procedencia = 'confirmada'
  ORDER BY
    -- Não classificadas primeiro; entre elas, as que já têm relato pronto,
    -- porque são as que dão para resolver agora.
    (cls.demanda_id IS NOT NULL),
    (coalesce(f.situacao, 'sem_registro') <> 'concluido'),
    rcl.data_conclusao DESC;
END $$;

-- O DROP acima levou os privilégios junto. Sem estas duas linhas a função
-- existe e ninguém consegue chamar — e o erro só aparece em runtime, na tela.
REVOKE ALL ON FUNCTION public.relatorio_pendencias_de_classificacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_pendencias_de_classificacao() TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. O RELATÓRIO PASSA A CARREGAR O RELATO
-- ---------------------------------------------------------------------------
/**
 * Acrescenta ao retorno os campos narrativos do fechamento. Nada mais muda:
 * mesmos filtros, mesma janela, mesma permissão, mesma ordem.
 *
 * `fechamento` continua devolvendo o ESTADO, e as colunas novas o TEXTO. A tela
 * precisa dos dois: "sem_registro" com texto vazio e "concluido" com texto
 * vazio são situações diferentes, e só o estado separa uma da outra.
 *
 * Nota interna não entra aqui, e isso é deliberado: o RH tem `relatorios.ver`
 * e este é o retorno que ele lê. O que aparece são os campos do fechamento —
 * texto que alguém escreveu sabendo que era relato oficial.
 */
DROP FUNCTION IF EXISTS public.relatorio_implementacoes(
  timestamptz, timestamptz, text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.relatorio_implementacoes(
  _inicio        timestamptz,
  _fim           timestamptz,
  _sistema       text DEFAULT NULL,
  _responsavel   uuid DEFAULT NULL,
  _busca         text DEFAULT NULL,
  _classificacao text DEFAULT NULL,
  _fechamento    text DEFAULT NULL
)
RETURNS TABLE (
  demanda_id        uuid,
  ticket_code       text,
  titulo            text,
  descricao         text,
  sistema_slug      text,
  tipo              text,
  prioridade        text,
  complexidade      text,
  status            text,
  responsavel_id    uuid,
  responsavel_nome  text,
  responsavel_email text,
  solicitante_id    uuid,
  solicitante_nome  text,
  solicitante_email text,
  criada_em         timestamptz,
  concluida_em      timestamptz,
  procedencia       text,
  evidencia         text,
  tarefas_total     integer,
  tarefas_feitas    integer,
  comentarios       integer,
  anexos            integer,
  fechamento        text,
  classificacao     text,
  classificacao_rotulo text,
  pontos            integer,
  justificativa     text,
  classificada_por  text,
  classificada_em   timestamptz,
  minutos_lancados  integer,
  ciclo_rotulo      text,
  -- O relato. É isto que faltava para o relatório responder "como foi feita".
  fechamento_solicitado    text,
  fechamento_problema      text,
  fechamento_solucao       text,
  fechamento_alterado      text,
  fechamento_resultado     text,
  fechamento_testes        text,
  fechamento_banco         text,
  fechamento_seguranca     text,
  fechamento_integracoes   text,
  fechamento_funcionalidades text,
  fechamento_observacoes   text,
  fechamento_sistemas      text[],
  fechamento_evidencias    text[],
  fechamento_por           text,
  fechamento_em            timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.tem_capacidade('relatorios.ver') OR public.is_equipe()) THEN
    RAISE EXCEPTION 'Sem permissão para ver relatórios.'
      USING HINT = 'É preciso a capacidade relatorios.ver.';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.ticket_code,
    d.title,
    d.description,
    d.sistema_slug,
    d.type::text,
    d.priority::text,
    d.complexity::text,
    d.status::text,
    d.assigned_to,
    resp.nome,
    resp.email,
    d.created_by,
    sol.nome,
    sol.email,
    d.created_at,
    rcl.data_conclusao,
    coalesce(rcl.procedencia, 'nao_identificada'),
    rcl.evidencia_descricao,
    coalesce(t.total, 0)::integer,
    coalesce(t.feitas, 0)::integer,
    coalesce(k.n, 0)::integer,
    coalesce(a.n, 0)::integer,
    coalesce(f.situacao, 'sem_registro'),
    cls.classificacao,
    tipo.rotulo,
    cls.pontos,
    cls.justificativa,
    cls.definido_por_email,
    cls.definido_em,
    coalesce(iv.minutos, 0)::integer,
    cic.rotulo,
    f.o_que_foi_solicitado,
    f.problema_identificado,
    f.solucao_implementada,
    f.o_que_foi_alterado,
    f.resultado_obtido,
    f.testes_realizados,
    f.banco_alterado,
    f.seguranca_rls,
    f.integracoes_realizadas,
    f.funcionalidades_implementadas,
    f.observacoes,
    f.sistemas_afetados,
    f.evidencias_links,
    f.preenchido_por_email,
    f.updated_at
  FROM public.demands d
  LEFT JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao_tipo tipo ON tipo.codigo = cls.classificacao
  LEFT JOIN public.profiles resp ON resp.id = d.assigned_to
  LEFT JOIN public.profiles sol  ON sol.id  = d.created_by
  LEFT JOIN public.relatorio_ciclo cic
         ON rcl.data_conclusao >= cic.inicio AND rcl.data_conclusao < cic.fim
  LEFT JOIN LATERAL (
    SELECT count(*) AS total, count(*) FILTER (WHERE completed) AS feitas
      FROM public.demand_tasks WHERE demand_id = d.id
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_comments
     WHERE demand_id = d.id AND NOT is_system AND NOT is_ai
  ) k ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_attachments WHERE demand_id = d.id
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT sum(EXTRACT(EPOCH FROM (i.fim - i.inicio)) / 60) AS minutos
      FROM public.relatorio_intervalo i WHERE i.demanda_id = d.id
  ) iv ON true
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    AND rcl.data_conclusao IS NOT NULL
    AND rcl.data_conclusao >= _inicio
    AND rcl.data_conclusao <  _fim
    AND (_sistema     IS NULL OR d.sistema_slug = _sistema)
    AND (_responsavel IS NULL OR d.assigned_to  = _responsavel)
    AND (_classificacao IS NULL OR _classificacao = 'todos'
         OR (_classificacao = 'sem_classificacao' AND cls.demanda_id IS NULL)
         OR cls.classificacao = _classificacao)
    AND (_fechamento IS NULL OR _fechamento = 'todos'
         OR (_fechamento = 'registrado' AND coalesce(f.situacao,'x') = 'concluido')
         OR (_fechamento = 'pendente'   AND coalesce(f.situacao,'x') <> 'concluido'))
    AND (
      _busca IS NULL OR _busca = ''
      OR d.title       ILIKE '%' || _busca || '%'
      OR d.description ILIKE '%' || _busca || '%'
      OR d.ticket_code ILIKE '%' || _busca || '%'
    )
  ORDER BY rcl.data_conclusao DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_implementacoes(
  timestamptz, timestamptz, text, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_implementacoes(
  timestamptz, timestamptz, text, uuid, text, text, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- Antes desta migration `na_fila` dava 1. Agora deve dar o total de concluídas
-- com data confirmada, e as colunas seguintes dizem quanto de trabalho falta.
--
-- ATENÇÃO — a primeira versão desta conferência chamava
-- `relatorio_pendencias_de_classificacao()` diretamente, e isso QUEBRAVA a
-- migration inteira.
--
-- No SQL Editor não há JWT, então `auth.uid()` é nulo. `get_my_role()` faz
-- COALESCE para 'requester', ou seja, nunca devolve nulo — então `is_equipe()`
-- e `tem_capacidade()` dão false, e a função levanta 'Sem permissão.'. Como o
-- editor roda o script inteiro numa transação, esse erro na ÚLTIMA linha
-- desfazia as três funções criadas acima. O sintoma era o pior possível: a
-- migration "não fazia nada", sem deixar claro que o problema era só a
-- conferência.
--
-- Regra que fica: conferência no fim de migration lê tabela, nunca chama
-- função com checagem de permissão dentro — quem roda migration é o dono do
-- banco, não um usuário logado.
--
-- Estes JOINs são de propósito os mesmos da função, para a conferência medir
-- o que a tela vai mostrar, e não outra coisa parecida.

SELECT
  count(*)                                                             AS na_fila,
  count(*) FILTER (WHERE coalesce(f.situacao, 'sem_registro') = 'concluido')
                                                                       AS com_relato,
  count(*) FILTER (WHERE coalesce(f.situacao, 'sem_registro') <> 'concluido'
                     AND coalesce(fio.n, 0) > 0)                       AS da_para_montar_do_fio,
  count(*) FILTER (WHERE coalesce(f.situacao, 'sem_registro') <> 'concluido'
                     AND coalesce(fio.n, 0) = 0)                       AS sem_nada_escrito,
  count(*) FILTER (WHERE cls.demanda_id IS NOT NULL)                   AS ja_classificadas
FROM public.demands d
JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
LEFT JOIN LATERAL (
  SELECT count(*) AS n FROM public.demand_comments c
   WHERE c.demand_id = d.id
     AND NOT c.is_ai AND NOT c.is_system
     AND c.user_id IS NOT NULL AND c.user_id <> d.created_by
     AND length(btrim(c.content)) > 15
) fio ON true
WHERE d.deleted_at IS NULL AND rcl.procedencia = 'confirmada';
