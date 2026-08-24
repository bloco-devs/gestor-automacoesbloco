-- ===========================================================================
-- SÓ SE CLASSIFICA O QUE ESTÁ CONCLUÍDO
-- ===========================================================================
--
-- O QUE O ANDRÉ VIU
--
-- "as demandas que precisam classificar ainda estão em desenvolvimento ou em
-- a fazer, por isso estão sem relatos."
--
-- Ele estava certo, e a causa é um filtro que faltava.
--
-- COMO ACONTECE
--
-- `relatorio_conclusao` guarda a data em que a demanda foi concluída. A linha
-- é gravada pelo trigger quando o status vira 'concluido'. Ela é um registro
-- histórico — e está certo que seja, porque é a fonte da data de apuração.
--
-- Mas se depois alguém puxa a demanda de volta para "Em desenvolvimento" ou
-- "A fazer", a linha permanece. E `relatorio_pendencias_de_classificacao`
-- exigia SÓ a existência dessa linha:
--
--   FROM public.demands d
--   JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
--   WHERE d.deleted_at IS NULL AND rcl.procedencia = 'confirmada'
--
-- Sem `d.status = 'concluido'`. Então demanda reaberta ficava na fila de
-- classificação para sempre, pedindo relato técnico de um trabalho que ainda
-- está sendo feito.
--
-- POR QUE SÓ APARECEU AGORA
--
-- Estava mascarado. A versão anterior fazia INNER JOIN em
-- `relatorio_fechamento_tecnico ... AND f.situacao = 'concluido'`, e como
-- quase ninguém preenchia fechamento, a fila mostrava 1 item. O defeito
-- existia desde 20260821160000 e nunca deu as caras.
--
-- Em 20260824160000 eu troquei aquele INNER JOIN por LEFT JOIN para destravar
-- a fila — que era o problema relatado — e junto tirei a máscara. As 46 que
-- apareceram incluíam as reabertas. Corrigi um defeito e revelei outro; o
-- segundo é este.
--
-- TODAS AS OUTRAS FUNÇÕES DO MÓDULO JÁ FILTRAVAM. `relatorio_implementacoes`,
-- `relatorio_apuracao_do_ciclo`, `relatorio_pendencias_do_ciclo`,
-- `relatorio_resultado_do_ciclo`, `relatorio_fechar_ciclo`,
-- `relatorio_ciclos_administraveis`, `relatorio_pendencias_de_fechamento` —
-- todas exigem `d.status = 'concluido'`. As duas de classificação eram as
-- únicas fora do padrão, e é isso que esta migration acerta.
--
-- CONSEQUÊNCIA PRÁTICA: a apuração NUNCA esteve errada. Ela filtra por status
-- e por isso nunca contou demanda reaberta. Nenhum ponto indevido foi somado,
-- nenhum ciclo fechou com número errado. O que existia era uma fila de
-- trabalho pedindo coisa impossível.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A LEITURA — a fila para de pedir relato de trabalho em andamento
-- ---------------------------------------------------------------------------
-- Só o WHERE muda. Mesma assinatura, mesmas 27 colunas: não precisa de DROP.
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
  fechamento       text,
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
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_comments c
     WHERE c.demand_id = d.id
       AND NOT c.is_ai AND NOT c.is_system
       AND c.user_id IS NOT NULL AND c.user_id <> d.created_by
       AND length(btrim(c.content)) > 15
  ) fio ON true
  WHERE d.deleted_at IS NULL
    AND rcl.procedencia = 'confirmada'
    -- A LINHA QUE FALTAVA. `relatorio_conclusao` é histórico e sobrevive à
    -- reabertura, de propósito; o status é quem diz onde a demanda está AGORA.
    AND d.status = 'concluido'
  ORDER BY
    (cls.demanda_id IS NOT NULL),
    (coalesce(f.situacao, 'sem_registro') <> 'concluido'),
    rcl.data_conclusao DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_pendencias_de_classificacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_pendencias_de_classificacao() TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. A ESCRITA — a trava de verdade
-- ---------------------------------------------------------------------------
/**
 * Tirar da lista resolve o sintoma. Isto resolve o problema.
 *
 * `relatorio_classificar` também não checava status. Dava para classificar e
 * pontuar uma demanda em desenvolvimento — direto pela API, ou pela tela se a
 * lista estivesse desatualizada em cache. Pontos por trabalho não terminado é
 * o erro mais caro que este módulo pode cometer, porque vira dinheiro.
 *
 * A apuração nunca teria contado esses pontos, porque ela filtra por status.
 * Mas a classificação ficaria gravada, com histórico e justificativa, e no dia
 * em que a demanda fosse concluída de novo ela entraria já classificada — com
 * uma decisão tomada quando o trabalho ainda nem existia.
 *
 * O QUE NÃO MUDA: classificação JÁ EXISTENTE de demanda reaberta continua
 * gravada. Reabrir não apaga o que foi decidido; só impede decidir de novo
 * enquanto o trabalho não estiver pronto.
 */
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
  v_uid         uuid := auth.uid();
  v_email       text;
  v_pontos      integer;
  v_anterior    public.relatorio_classificacao;
  v_responsavel uuid;
  v_status      text;
  v_auto        boolean;
  v_fechado     boolean;
  v_saida       public.relatorio_classificacao;
BEGIN
  IF NOT public.tem_capacidade('classificacao.definir') THEN
    RAISE EXCEPTION 'Sem permissão para classificar.'
      USING HINT = 'É preciso a capacidade classificacao.definir.';
  END IF;

  SELECT d.assigned_to, d.status::text INTO v_responsavel, v_status
    FROM public.demands d WHERE d.id = _demanda_id AND d.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada.';
  END IF;

  -- A trava nova.
  IF v_status <> 'concluido' THEN
    RAISE EXCEPTION 'Esta demanda não está concluída — o status atual é "%".', v_status
      USING HINT = 'Classificar define pontos que viram remuneração. Só depois de concluída.';
  END IF;

  v_auto := (v_responsavel IS NOT NULL AND v_responsavel = v_uid);

  SELECT (f.situacao = 'concluido') INTO v_fechado
    FROM public.relatorio_fechamento_tecnico f WHERE f.demanda_id = _demanda_id;
  IF coalesce(v_fechado, false) = false THEN
    RAISE EXCEPTION 'O fechamento técnico desta demanda ainda não foi concluído.'
      USING HINT = 'Registre problema, solução, alterações e resultado antes de classificar.';
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

  IF FOUND AND length(btrim(coalesce(_motivo, ''))) < 10 THEN
    RAISE EXCEPTION 'Alterar uma classificação existente exige o motivo da mudança.'
      USING HINT = format('Hoje está %s. Explique o que mudou no entendimento.',
                          v_anterior.classificacao);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.relatorio_classificacao AS rc
    (demanda_id, classificacao, pontos, justificativa,
     definido_por, definido_por_email, autoclassificada)
  VALUES
    (_demanda_id, _classificacao, v_pontos, btrim(_justificativa),
     v_uid, v_email, v_auto)
  ON CONFLICT (demanda_id) DO UPDATE SET
    classificacao      = EXCLUDED.classificacao,
    pontos             = EXCLUDED.pontos,
    justificativa      = EXCLUDED.justificativa,
    definido_por       = EXCLUDED.definido_por,
    definido_por_email = EXCLUDED.definido_por_email,
    autoclassificada   = EXCLUDED.autoclassificada,
    definido_em        = now(),
    updated_at         = now()
  RETURNING rc.* INTO v_saida;

  INSERT INTO public.relatorio_classificacao_historico
    (demanda_id, origem,
     classificacao_de, classificacao_para, pontos_de, pontos_para,
     justificativa, motivo_da_alteracao, alterado_por, alterado_por_email,
     autoclassificada)
  VALUES
    (_demanda_id,
     CASE WHEN v_anterior.demanda_id IS NULL THEN 'definicao' ELSE 'alteracao' END,
     v_anterior.classificacao, _classificacao,
     v_anterior.pontos, v_pontos,
     btrim(_justificativa),
     CASE WHEN v_anterior.demanda_id IS NULL THEN NULL ELSE btrim(_motivo) END,
     v_uid, v_email, v_auto);

  RETURN v_saida;
END $$;


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- Quantas demandas tinham data de conclusão registrada mas VOLTARAM para o
-- fluxo. São as que sumiram da fila de classificação agora — e some porque
-- não deviam estar lá, não porque foram perdidas.

SELECT
  d.status::text                                       AS status_atual,
  count(*)                                             AS demandas,
  count(*) FILTER (WHERE cls.demanda_id IS NOT NULL)   AS ja_classificadas,
  min(rcl.data_conclusao)::date                        AS concluida_de,
  max(rcl.data_conclusao)::date                        AS concluida_ate
FROM public.demands d
JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
WHERE d.deleted_at IS NULL AND rcl.procedencia = 'confirmada'
GROUP BY d.status
ORDER BY count(*) DESC;
