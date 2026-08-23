-- ===========================================================================
-- PRÉ-VALIDAÇÃO DA ETAPA 1 — módulo de relatórios e remuneração variável
-- ===========================================================================
--
-- Sistema: gestor-automacoesbloco (cgbhpenkytibgiosksrb)
-- Valida: supabase/migrations/20260821120000_relatorios_fundacao.sql
--
-- ESTE SCRIPT É SOMENTE LEITURA. Não cria, não altera e não apaga nada.
-- (A única exceção é o BLOCO 8, opcional, que usa uma tabela TEMPORÁRIA
--  dentro de uma transação revertida — e está claramente separado no fim.)
--
-- Rode bloco por bloco no SQL Editor. Cada um devolve um veredito.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- BLOCO 1 — AMBIENTE
-- ---------------------------------------------------------------------------
-- O que decide: a sintaxe `INSERT ... AS alias ... ON CONFLICT ... RETURNING
-- alias.*` exige Postgres 9.5+. Qualquer Supabase atual passa, mas o número
-- precisa estar no relatório, não na suposição.

SELECT
  current_setting('server_version')            AS versao_postgres,
  current_setting('server_version_num')::int   AS versao_num,
  CASE WHEN current_setting('server_version_num')::int >= 90500
       THEN '✅ suporta INSERT ... AS alias ... RETURNING alias.*'
       ELSE '❌ versão antiga demais'
  END                                          AS veredito_sintaxe,
  current_setting('TimeZone')                  AS timezone_do_servidor,
  now()                                        AS agora_utc,
  now() AT TIME ZONE 'America/Sao_Paulo'       AS agora_em_sao_paulo;


-- ---------------------------------------------------------------------------
-- BLOCO 2 — EXTENSÕES E SUPORTE A GiST EM RANGE
-- ---------------------------------------------------------------------------
-- O que decide: a constraint
--   EXCLUDE USING gist (tstzrange(inicio, fim, '[)') WITH &&)
-- usa APENAS o range, sem coluna escalar do tipo `pessoa_id WITH =`. Nesse
-- formato o suporte é nativo do core. A consulta abaixo prova isso olhando
-- o catálogo, em vez de confiar na leitura da documentação.

SELECT string_agg(extname || ' ' || extversion, ', ' ORDER BY extname) AS extensoes_instaladas
  FROM pg_extension;

SELECT
  EXISTS (
    SELECT 1
      FROM pg_opclass oc
      JOIN pg_am   am ON am.oid = oc.opcmethod
      JOIN pg_type t  ON t.oid  = oc.opcintype
     WHERE am.amname = 'gist'
       AND t.typname = 'tstzrange'
  ) AS gist_suporta_tstzrange,
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') AS btree_gist_instalado,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_opclass oc
        JOIN pg_am am ON am.oid = oc.opcmethod
        JOIN pg_type t ON t.oid = oc.opcintype
       WHERE am.amname = 'gist' AND t.typname = 'tstzrange')
    THEN '✅ EXCLUDE só com tstzrange WITH && funciona sem btree_gist'
    ELSE '❌ falta suporte gist para tstzrange — a constraint vai falhar'
  END AS veredito;


-- ---------------------------------------------------------------------------
-- BLOCO 3 — DEPENDÊNCIAS QUE A MIGRATION ASSUME EXISTIR
-- ---------------------------------------------------------------------------
-- Se qualquer linha vier ❌, a migration falha no meio.

SELECT item, tipo,
       CASE WHEN existe THEN '✅ existe' ELSE '❌ FALTA' END AS situacao
FROM (
  SELECT 'public.demands'                     AS item, 'tabela'  AS tipo, to_regclass('public.demands')            IS NOT NULL AS existe
  UNION ALL SELECT 'public.demand_audit_logs',      'tabela',  to_regclass('public.demand_audit_logs')      IS NOT NULL
  UNION ALL SELECT 'public.allowed_emails',         'tabela',  to_regclass('public.allowed_emails')         IS NOT NULL
  UNION ALL SELECT 'public.get_my_role()',          'função',  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_my_role')
  UNION ALL SELECT 'public.is_equipe()',            'função',  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_equipe')
  UNION ALL SELECT 'public.update_updated_at_column()', 'função', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='update_updated_at_column')
  UNION ALL SELECT 'public.demand_status',          'tipo',    EXISTS (SELECT 1 FROM pg_type WHERE typname='demand_status')
  UNION ALL SELECT 'public.demand_complexity',      'tipo',    EXISTS (SELECT 1 FROM pg_type WHERE typname='demand_complexity')
) d
ORDER BY (NOT existe) DESC, tipo, item;


-- ---------------------------------------------------------------------------
-- BLOCO 4 — COLISÃO DE NOMES
-- ---------------------------------------------------------------------------
-- Tudo deve vir "livre". Se algo já existir, a migration pode sobrescrever
-- comportamento de outro módulo sem avisar.

SELECT objeto, tipo,
       CASE WHEN ja_existe THEN '⚠️ JÁ EXISTE' ELSE '✅ livre' END AS situacao
FROM (
  SELECT 'relatorio_capacidade'          AS objeto, 'tabela' AS tipo, to_regclass('public.relatorio_capacidade')          IS NOT NULL AS ja_existe
  UNION ALL SELECT 'relatorio_classificacao_tipo', 'tabela', to_regclass('public.relatorio_classificacao_tipo') IS NOT NULL
  UNION ALL SELECT 'relatorio_faixa',              'tabela', to_regclass('public.relatorio_faixa')              IS NOT NULL
  UNION ALL SELECT 'relatorio_ciclo',              'tabela', to_regclass('public.relatorio_ciclo')              IS NOT NULL
  UNION ALL SELECT 'relatorio_conclusao',          'tabela', to_regclass('public.relatorio_conclusao')          IS NOT NULL
  UNION ALL SELECT 'tem_capacidade',               'função', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='tem_capacidade')
  UNION ALL SELECT 'pode_ver_remuneracao_de',      'função', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='pode_ver_remuneracao_de')
  UNION ALL SELECT 'relatorio_faixa_para',         'função', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='relatorio_faixa_para')
  UNION ALL SELECT 'relatorio_ciclo_janela',       'função', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='relatorio_ciclo_janela')
  UNION ALL SELECT 'relatorio_ciclo_de',           'função', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='relatorio_ciclo_de')
  UNION ALL SELECT 'relatorio_resolver_conclusao', 'função', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='relatorio_resolver_conclusao')
) c
ORDER BY ja_existe DESC, tipo, objeto;


-- ---------------------------------------------------------------------------
-- BLOCO 5 — ORDEM REAL DE EXECUÇÃO DOS TRIGGERS EM `demands`
-- ---------------------------------------------------------------------------
-- O que decide: o trigger novo se chama `trg_zz_relatorio_conclusao` porque
-- ele LÊ `demand_audit_logs`, escrita por `trg_audit_demand_changes` — também
-- AFTER UPDATE. Triggers de mesmo momento disparam em ordem alfabética, então
-- o novo precisa aparecer DEPOIS do de auditoria na lista abaixo.
--
-- Se ele aparecer antes, toda conclusão vira "nao_identificada".

SELECT
  row_number() OVER (ORDER BY t.tgname) AS ordem_execucao,
  t.tgname                              AS trigger_nome,
  CASE WHEN (t.tgtype & 2) > 0 THEN 'BEFORE' ELSE 'AFTER' END AS momento,
  concat_ws(' / ',
    CASE WHEN (t.tgtype & 4)  > 0 THEN 'INSERT' END,
    CASE WHEN (t.tgtype & 8)  > 0 THEN 'DELETE' END,
    CASE WHEN (t.tgtype & 16) > 0 THEN 'UPDATE' END
  )                                     AS eventos,
  p.proname                             AS funcao
FROM pg_trigger t
JOIN pg_proc    p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.demands'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Veredito automático da ordenação (rode depois da migration; antes dela o
-- trigger novo ainda não existe e a resposta esperada é "ainda não criado").
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_zz_relatorio_conclusao'
                       AND tgrelid='public.demands'::regclass)
      THEN 'ℹ️ trigger novo ainda não criado — reconfira depois de aplicar'
    WHEN 'trg_zz_relatorio_conclusao' > 'trg_audit_demand_changes'
      THEN '✅ ordena depois da auditoria'
    ELSE '❌ ordena ANTES da auditoria — conclusão viraria nao_identificada'
  END AS veredito_ordem;


-- ---------------------------------------------------------------------------
-- BLOCO 6 — A JANELA DO CICLO 20 → 19
-- ---------------------------------------------------------------------------
-- O que decide: um erro de um dia aqui paga ou deixa de pagar um dia de
-- trabalho. Testa a expressão exata da migration, sem depender dela existir.
--
-- Esperado para referência 2026-09-01:
--   inicio = 2026-08-20 00:00 America/Sao_Paulo  = 2026-08-20 03:00+00
--   fim    = 2026-09-20 00:00 America/Sao_Paulo  = 2026-09-20 03:00+00

WITH ref AS (
  SELECT d::date AS referencia FROM (VALUES
    ('2026-09-01'), -- o primeiro ciclo
    ('2026-01-01'), -- virada de ano: deve olhar para dezembro do ano anterior
    ('2026-03-01'), -- março, onde havia horário de verão antes de 2019
    ('2026-12-01')  -- dezembro
  ) v(d)
),
calc AS (
  SELECT
    referencia,
    (date_trunc('month', referencia)::date - INTERVAL '1 month' + INTERVAL '19 days')::timestamp
      AT TIME ZONE 'America/Sao_Paulo' AS inicio,
    (date_trunc('month', referencia)::date + INTERVAL '19 days')::timestamp
      AT TIME ZONE 'America/Sao_Paulo' AS fim
  FROM ref
)
SELECT
  to_char(referencia, 'MM/YYYY')                                        AS ciclo_de_referencia,
  to_char(inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS inicio_local,
  to_char(fim    AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS fim_local,
  inicio                                                                AS inicio_utc,
  fim                                                                   AS fim_utc,
  CASE WHEN EXTRACT(DAY FROM inicio AT TIME ZONE 'America/Sao_Paulo') = 20
        AND EXTRACT(DAY FROM fim    AT TIME ZONE 'America/Sao_Paulo') = 20
       THEN '✅ começa e termina no dia 20'
       ELSE '❌ dia errado'
  END                                                                   AS veredito
FROM calc
ORDER BY referencia;

-- As bordas, que são o que realmente importa. Todas devem vir ✅.
WITH janela AS (
  SELECT
    (date_trunc('month', DATE '2026-09-01')::date - INTERVAL '1 month' + INTERVAL '19 days')::timestamp
      AT TIME ZONE 'America/Sao_Paulo' AS inicio,
    (date_trunc('month', DATE '2026-09-01')::date + INTERVAL '19 days')::timestamp
      AT TIME ZONE 'America/Sao_Paulo' AS fim
),
casos AS (
  SELECT * FROM (VALUES
    ('19/08 23:59:59 — véspera do ciclo', '2026-08-19 23:59:59'::timestamp, false),
    ('20/08 00:00:00 — primeiro instante', '2026-08-20 00:00:00'::timestamp, true),
    ('31/08 23:59:59 — o que a regra 01→19 perdia', '2026-08-31 23:59:59'::timestamp, true),
    ('01/09 00:00:00', '2026-09-01 00:00:00'::timestamp, true),
    ('19/09 21:30:00 — a noite que UTC roubaria', '2026-09-19 21:30:00'::timestamp, true),
    ('19/09 23:59:59 — último instante', '2026-09-19 23:59:59'::timestamp, true),
    ('20/09 00:00:00 — já é o ciclo seguinte', '2026-09-20 00:00:00'::timestamp, false)
  ) c(caso, momento_local, esperado_dentro)
)
SELECT
  c.caso,
  (c.momento_local AT TIME ZONE 'America/Sao_Paulo') AS momento_utc,
  c.esperado_dentro,
  ((c.momento_local AT TIME ZONE 'America/Sao_Paulo') >= j.inicio
   AND (c.momento_local AT TIME ZONE 'America/Sao_Paulo') <  j.fim) AS calculado_dentro,
  CASE WHEN c.esperado_dentro =
            ((c.momento_local AT TIME ZONE 'America/Sao_Paulo') >= j.inicio
             AND (c.momento_local AT TIME ZONE 'America/Sao_Paulo') < j.fim)
       THEN '✅' ELSE '❌ DIVERGIU' END AS veredito
FROM casos c CROSS JOIN janela j
ORDER BY c.momento_local;


-- ---------------------------------------------------------------------------
-- BLOCO 7 — PRÉVIA DA RESOLUÇÃO DE DATA (sem escrever nada)
-- ---------------------------------------------------------------------------
-- O que decide: quantas demandas concluídas teriam data CONFIRMADA e quantas
-- cairiam em NAO_IDENTIFICADA. O segundo número é o volume de triagem manual
-- antes do primeiro fechamento — e é bom sabê-lo antes de prometer prazo.

SELECT
  count(*)                                            AS concluidas_total,
  count(*) FILTER (WHERE a.id IS NOT NULL)            AS viraria_confirmada,
  count(*) FILTER (WHERE a.id IS NULL)                AS viraria_nao_identificada,
  round(100.0 * count(*) FILTER (WHERE a.id IS NOT NULL)
        / NULLIF(count(*), 0), 1)                     AS pct_confirmada,
  min(a.created_at)                                   AS transicao_mais_antiga,
  max(a.created_at)                                   AS transicao_mais_recente
FROM public.demands d
LEFT JOIN LATERAL (
  SELECT l.id, l.created_at
    FROM public.demand_audit_logs l
   WHERE l.demand_id = d.id
     AND l.action    = 'status_changed'
     AND l.new_value = 'concluido'
   ORDER BY l.created_at DESC
   LIMIT 1
) a ON true
WHERE d.status = 'concluido'
  AND d.deleted_at IS NULL;

-- Quantas teriam MAIS DE UMA transição para concluído (ou seja, foram
-- reabertas). Para essas vale a ÚLTIMA — se o número for alto, vale conferir
-- se a regra faz sentido para vocês.
SELECT count(*) AS demandas_reabertas
FROM (
  SELECT l.demand_id
    FROM public.demand_audit_logs l
   WHERE l.action = 'status_changed' AND l.new_value = 'concluido'
   GROUP BY l.demand_id
  HAVING count(*) > 1
) r;

-- Quantas concluídas ficariam sem sistema no relatório agrupado por sistema.
SELECT
  count(*)                                                     AS concluidas,
  count(*) FILTER (WHERE sistema_slug IS NOT NULL)              AS com_slug,
  count(*) FILTER (WHERE sistema_slug IS NULL AND system_id IS NOT NULL) AS so_com_system_id,
  count(*) FILTER (WHERE sistema_slug IS NULL AND system_id IS NULL)     AS sem_sistema_algum
FROM public.demands
WHERE status = 'concluido' AND deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- BLOCO 8 — A LÓGICA DAS FAIXAS, TESTADA ANTES DE EXISTIR
-- ---------------------------------------------------------------------------
-- Reproduz os valores semeados e a busca da função `relatorio_faixa_para`
-- num CTE, sem depender de nenhuma tabela. Prova a resolução de percentual
-- ANTES de criar qualquer objeto.
--
-- A coluna `veredito` precisa vir ✅ em TODAS as linhas.

WITH faixa (rotulo, percentual_min, percentual_max, valor_reais) AS (
  VALUES
    ('Abaixo da meta',   0.00::numeric,   80.00::numeric,    0.00::numeric),
    ('Meta parcial',    80.00,           100.00,           800.00),
    ('Meta atingida',  100.00,           100.00,          1000.00),
    ('Não definida',   100.01,           120.00,          NULL),
    ('Superação',      120.00,           NULL,            1200.00)
),
caso (descricao, percentual, esperado_rotulo, esperado_valor) AS (
  VALUES
    ('0% — nada feito',                       0.00::numeric, 'Abaixo da meta',    0.00::numeric),
    ('79,995% — logo abaixo do corte',       79.995,         'Abaixo da meta',    0.00),
    ('80% — o corte exato',                  80.00,          'Meta parcial',    800.00),
    ('99,875% = 799 pts sobre 800',          99.875,         'Meta parcial',    800.00),
    ('99,995% — o vão que eu tinha deixado', 99.995,         'Meta parcial',    800.00),
    ('100% — meta batida',                  100.00,          'Meta atingida',  1000.00),
    ('106,25% = 850 pts sobre 800',         106.25,          'Não definida',    NULL),
    ('118,75% = 950 pts sobre 800',         118.75,          'Não definida',    NULL),
    ('119,995% — o outro vão',              119.995,         'Não definida',    NULL),
    ('120% — superação exata',              120.00,          'Superação',      1200.00),
    ('150% — bem acima',                    150.00,          'Superação',      1200.00)
),
resolvido AS (
  SELECT
    c.descricao, c.percentual, c.esperado_rotulo, c.esperado_valor,
    (SELECT f.rotulo FROM faixa f
      WHERE c.percentual >= f.percentual_min
        AND (f.percentual_max IS NULL OR c.percentual <= f.percentual_max)
      ORDER BY f.percentual_min DESC LIMIT 1) AS achou_rotulo,
    (SELECT f.valor_reais FROM faixa f
      WHERE c.percentual >= f.percentual_min
        AND (f.percentual_max IS NULL OR c.percentual <= f.percentual_max)
      ORDER BY f.percentual_min DESC LIMIT 1) AS achou_valor
  FROM caso c
)
SELECT
  descricao,
  percentual,
  coalesce(achou_rotulo, '(nenhuma faixa)')                        AS faixa_encontrada,
  coalesce(achou_valor::text, 'sem valor definido')                AS valor,
  CASE WHEN achou_rotulo IS NOT DISTINCT FROM esperado_rotulo
        AND achou_valor  IS NOT DISTINCT FROM esperado_valor
       THEN '✅' ELSE '❌ DIVERGIU' END                             AS veredito
FROM resolvido
ORDER BY percentual;

-- Confirma que 950 pontos sobre meta 800 realmente dá 118,75% e cai na
-- lacuna — o caso que o RH mais cita e que hoje NÃO gera valor.
SELECT
  950                                        AS pontos,
  800                                        AS meta,
  round(100.0 * 950 / 800, 4)                AS percentual,
  'Faixa de remuneração não definida'        AS mensagem_esperada;


-- ---------------------------------------------------------------------------
-- BLOCO 9 — OPCIONAL: sintaxe INSERT ... AS alias ... RETURNING alias.*
-- ---------------------------------------------------------------------------
-- Usa uma tabela TEMPORÁRIA e desfaz tudo. Nenhum objeto do schema é criado.
-- Rode o bloco inteiro de uma vez, incluindo o ROLLBACK.

BEGIN;

CREATE TEMP TABLE _teste_sintaxe (
  chave text PRIMARY KEY,
  valor text
) ON COMMIT DROP;

INSERT INTO _teste_sintaxe AS t (chave, valor)
VALUES ('a', 'primeiro')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
RETURNING t.*;

-- Agora o caminho do conflito, que é o que a função de resolução usa.
INSERT INTO _teste_sintaxe AS t (chave, valor)
VALUES ('a', 'segundo')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
RETURNING t.chave, t.valor;

ROLLBACK;
