-- ===========================================================================
-- FASE 4 — A ELEGIBILIDADE PASSA A FECHAR
-- ===========================================================================
--
-- O DEFEITO
--
-- `relatorio_pendencias_do_ciclo` contava assim:
--
--   sem_fechamento     → coalesce(f.situacao,'x') <> 'concluido'
--   sem_data_confiavel → rcl.procedencia <> 'confirmada'
--
-- Uma demanda sem fechamento E sem data confiável satisfaz as DUAS. Ela era
-- contada duas vezes, e as categorias somavam mais que o total de concluídas.
--
-- POR QUE ISSO É PIOR DO QUE PARECE
--
-- Quem lê o quadro é o RH, decidindo se fecha o ciclo. Um quadro que não soma
-- não é só feio: ele destrói a confiança no número que importa. Se "47
-- concluídas" e as categorias dão 52, a pergunta seguinte é "então quantas
-- entraram na apuração, afinal?" — e a resposta certa (32) passa a parecer tão
-- arbitrária quanto as outras.
--
-- A CORREÇÃO
--
-- Partição por prioridade. Cada demanda cai em exatamente uma categoria:
--
--   1. sem_data_confiavel  → procedência não confirmada
--   2. sem_fechamento      → data ok, relato técnico não registrado
--   3. sem_classificacao   → data ok, relato ok, ninguém classificou
--   4. elegiveis           → os três em ordem
--
--   concluidas = 1 + 2 + 3 + 4. Sempre.
--
-- A ordem não é arbitrária. A data vem primeiro porque, sem ela, a demanda não
-- pertence a ciclo nenhum — discutir se falta relato numa demanda que talvez
-- nem seja deste período é resolver o problema errado.
--
-- `com_fechamento` e `classificadas` voltam junto, mas são CUMULATIVAS e não
-- fazem parte da partição. Servem para a frase "40 de 47 já têm relato", que é
-- o que diz ao RH quanto trabalho falta. A tela precisa tratá-las separado —
-- somá-las com as quatro daria número sem significado.
--
-- Esta é a mesma definição que `relatorio_ciclos_administraveis` já usa desde
-- a FASE 2. Agora as duas concordam.
-- ===========================================================================


-- Acrescentar colunas muda o tipo de retorno, e `CREATE OR REPLACE` recusa.
-- Conferido: nenhuma view ou função depende desta — só o cliente, por RPC.
DROP FUNCTION IF EXISTS public.relatorio_pendencias_do_ciclo(uuid);

CREATE OR REPLACE FUNCTION public.relatorio_pendencias_do_ciclo(_ciclo_id uuid)
RETURNS TABLE (
  -- A partição. Estas quatro somam `concluidas_no_ciclo`.
  concluidas_no_ciclo integer,
  elegiveis           integer,
  sem_fechamento      integer,
  sem_classificacao   integer,
  sem_data_confiavel  integer,
  -- Cumulativas. NÃO somar com as de cima.
  com_fechamento      integer,
  classificadas       integer
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
  -- Contagem de trabalho pendente, não valor financeiro: `relatorios.ver`
  -- basta, e a equipe também precisa ver o que falta dela. Nenhuma coluna
  -- daqui é dinheiro.
  IF NOT (public.tem_capacidade('relatorios.ver') OR public.is_equipe()) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  SELECT c.inicio, c.fim INTO v_inicio, v_fim
    FROM public.relatorio_ciclo c WHERE c.id = _ciclo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo não encontrado.'; END IF;

  RETURN QUERY
  SELECT
    count(*)::integer,
    -- Elegível: procedência confirmada + relato concluído + classificada.
    count(*) FILTER (
      WHERE rcl.procedencia = 'confirmada'
        AND coalesce(f.situacao, 'x') = 'concluido'
        AND cls.demanda_id IS NOT NULL)::integer,
    -- As três exclusões, cada uma exigindo que a anterior tenha passado. É o
    -- `AND rcl.procedencia = 'confirmada'` que elimina a dupla contagem.
    count(*) FILTER (
      WHERE rcl.procedencia = 'confirmada'
        AND coalesce(f.situacao, 'x') <> 'concluido')::integer,
    count(*) FILTER (
      WHERE rcl.procedencia = 'confirmada'
        AND coalesce(f.situacao, 'x') = 'concluido'
        AND cls.demanda_id IS NULL)::integer,
    count(*) FILTER (WHERE rcl.procedencia <> 'confirmada')::integer,
    -- Cumulativas.
    count(*) FILTER (WHERE coalesce(f.situacao, 'x') = 'concluido')::integer,
    count(*) FILTER (WHERE cls.demanda_id IS NOT NULL)::integer
  FROM public.demands d
  JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    AND rcl.data_conclusao IS NOT NULL
    -- Semiaberto, como em todo o módulo. O último dia entra inteiro.
    AND rcl.data_conclusao >= v_inicio
    AND rcl.data_conclusao <  v_fim;
END $$;

-- O DROP levou os privilégios. Sem estas duas linhas a função existe e a tela
-- recebe "permission denied" só em runtime.
REVOKE ALL ON FUNCTION public.relatorio_pendencias_do_ciclo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_pendencias_do_ciclo(uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- DÍVIDA DA FASE 3 — o comentário de `relatorio_ciclo_janela`
-- ---------------------------------------------------------------------------
-- A função descreve a si mesma como "a janela do ciclo", o que a fazia parecer
-- a regra do sistema. Ela é conveniência: sugere um período 20 → 19 para quem
-- está cadastrando ciclo. O período que vale é o gravado em `relatorio_ciclo`.
COMMENT ON FUNCTION public.relatorio_ciclo_janela(date, text) IS
  'SUGESTÃO de janela 20 → 19 para preencher o cadastro de um ciclo. NÃO é a regra do sistema: o período de cada ciclo são as colunas inicio/fim de relatorio_ciclo, definidas pelo RH.';


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- Lê as tabelas direto, sem chamar a função — no SQL Editor não há JWT e a
-- checagem de capacidade derrubaria a migration inteira no rollback.
--
-- `fecha` precisa dar `sim` em toda linha. Se der `NAO`, há dupla contagem e
-- a correção não funcionou.

SELECT
  c.rotulo,
  count(*)                                                                  AS concluidas,
  count(*) FILTER (WHERE rcl.procedencia = 'confirmada'
                     AND coalesce(f.situacao,'x') = 'concluido'
                     AND cls.demanda_id IS NOT NULL)                        AS elegiveis,
  count(*) FILTER (WHERE rcl.procedencia = 'confirmada'
                     AND coalesce(f.situacao,'x') <> 'concluido')           AS sem_fechamento,
  count(*) FILTER (WHERE rcl.procedencia = 'confirmada'
                     AND coalesce(f.situacao,'x') = 'concluido'
                     AND cls.demanda_id IS NULL)                            AS sem_classificacao,
  count(*) FILTER (WHERE rcl.procedencia <> 'confirmada')                   AS sem_data_confiavel,
  CASE WHEN count(*) =
         count(*) FILTER (WHERE rcl.procedencia = 'confirmada'
                            AND coalesce(f.situacao,'x') = 'concluido'
                            AND cls.demanda_id IS NOT NULL)
       + count(*) FILTER (WHERE rcl.procedencia = 'confirmada'
                            AND coalesce(f.situacao,'x') <> 'concluido')
       + count(*) FILTER (WHERE rcl.procedencia = 'confirmada'
                            AND coalesce(f.situacao,'x') = 'concluido'
                            AND cls.demanda_id IS NULL)
       + count(*) FILTER (WHERE rcl.procedencia <> 'confirmada')
       THEN 'sim' ELSE 'NAO' END                                            AS fecha
FROM public.relatorio_ciclo c
JOIN public.demands d ON d.deleted_at IS NULL AND d.status = 'concluido'
JOIN public.relatorio_conclusao rcl
     ON rcl.demanda_id = d.id
    AND rcl.data_conclusao >= c.inicio
    AND rcl.data_conclusao <  c.fim
LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
GROUP BY c.rotulo, c.inicio
ORDER BY c.inicio DESC;
