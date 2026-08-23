-- Sistema: gestor-automacoesbloco (cgbhpenkytibgiosksrb)
-- Pré-validação consolidada da Etapa 1. SOMENTE LEITURA.
-- Cole tudo de uma vez. Toda linha deve vir ✅ ou ℹ️.

WITH
gist_ok AS (
  -- Procura `range_ops`, não `tstzrange`. A classe de operadores GiST para
  -- intervalos é POLIMÓRFICA: o catálogo registra `opcintype = anyrange`, e
  -- nunca um tipo concreto como tstzrange. A primeira versão desta consulta
  -- procurava o nome concreto, não achava nunca, e reprovava um banco
  -- perfeitamente capaz.
  SELECT EXISTS (
    SELECT 1 FROM pg_opclass oc
      JOIN pg_am am ON am.oid = oc.opcmethod
     WHERE am.amname = 'gist' AND oc.opcname = 'range_ops'
  ) AS v
),
janela AS (
  SELECT
    (date_trunc('month', DATE '2026-09-01')::date - INTERVAL '1 month' + INTERVAL '19 days')::timestamp
      AT TIME ZONE 'America/Sao_Paulo' AS ini,
    (date_trunc('month', DATE '2026-09-01')::date + INTERVAL '19 days')::timestamp
      AT TIME ZONE 'America/Sao_Paulo' AS fim
),
bordas AS (
  SELECT count(*) FILTER (WHERE ok) AS passou, count(*) AS total
  FROM (
    SELECT (c.esperado = ((c.m AT TIME ZONE 'America/Sao_Paulo') >= j.ini
                      AND (c.m AT TIME ZONE 'America/Sao_Paulo') <  j.fim)) AS ok
    FROM (VALUES
      ('2026-08-19 23:59:59'::timestamp, false),
      ('2026-08-20 00:00:00'::timestamp, true),
      ('2026-08-31 23:59:59'::timestamp, true),
      ('2026-09-01 00:00:00'::timestamp, true),
      ('2026-09-19 21:30:00'::timestamp, true),
      ('2026-09-19 23:59:59'::timestamp, true),
      ('2026-09-20 00:00:00'::timestamp, false)
    ) c(m, esperado) CROSS JOIN janela j
  ) x
),
faixa (rotulo, pmin, pmax, valor) AS (
  VALUES ('Abaixo da meta', 0.00::numeric,  80.00::numeric,    0.00::numeric),
         ('Meta parcial',  80.00,          100.00,           800.00),
         ('Meta atingida', 100.00,         100.00,          1000.00),
         ('Não definida',  100.01,         120.00,          NULL),
         ('Superação',     120.00,         NULL,            1200.00)
),
faixa_casos (p, er, ev) AS (
  VALUES (0.00::numeric, 'Abaixo da meta', 0.00::numeric),
         (79.995,        'Abaixo da meta', 0.00),
         (80.00,         'Meta parcial',   800.00),
         (99.875,        'Meta parcial',   800.00),
         (99.995,        'Meta parcial',   800.00),
         (100.00,        'Meta atingida',  1000.00),
         (106.25,        'Não definida',   NULL),
         (118.75,        'Não definida',   NULL),
         (119.995,       'Não definida',   NULL),
         (120.00,        'Superação',      1200.00),
         (150.00,        'Superação',      1200.00)
),
faixa_res AS (
  SELECT count(*) FILTER (WHERE ok) AS passou, count(*) AS total
  FROM (
    SELECT (
      (SELECT f.rotulo FROM faixa f
        WHERE c.p >= f.pmin AND (f.pmax IS NULL OR c.p <= f.pmax)
        ORDER BY f.pmin DESC LIMIT 1) IS NOT DISTINCT FROM c.er
      AND
      (SELECT f.valor FROM faixa f
        WHERE c.p >= f.pmin AND (f.pmax IS NULL OR c.p <= f.pmax)
        ORDER BY f.pmin DESC LIMIT 1) IS NOT DISTINCT FROM c.ev
    ) AS ok
    FROM faixa_casos c
  ) y
),
conc AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE a.id IS NOT NULL) AS conf,
         count(*) FILTER (WHERE a.id IS NULL)     AS naoid
  FROM public.demands d
  LEFT JOIN LATERAL (
    SELECT l.id FROM public.demand_audit_logs l
     WHERE l.demand_id = d.id AND l.action = 'status_changed' AND l.new_value = 'concluido'
     ORDER BY l.created_at DESC LIMIT 1
  ) a ON true
  WHERE d.status = 'concluido' AND d.deleted_at IS NULL
),
sis AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE sistema_slug IS NOT NULL) AS com_slug,
         count(*) FILTER (WHERE sistema_slug IS NULL AND system_id IS NOT NULL) AS so_id,
         count(*) FILTER (WHERE sistema_slug IS NULL AND system_id IS NULL) AS sem
  FROM public.demands WHERE status = 'concluido' AND deleted_at IS NULL
),
reab AS (
  SELECT count(*) AS n FROM (
    SELECT demand_id FROM public.demand_audit_logs
     WHERE action = 'status_changed' AND new_value = 'concluido'
     GROUP BY demand_id HAVING count(*) > 1
  ) r
),
colisao AS (
  SELECT count(*) AS n FROM (
    SELECT 1 WHERE to_regclass('public.relatorio_capacidade') IS NOT NULL
    UNION ALL SELECT 1 WHERE to_regclass('public.relatorio_classificacao_tipo') IS NOT NULL
    UNION ALL SELECT 1 WHERE to_regclass('public.relatorio_faixa') IS NOT NULL
    UNION ALL SELECT 1 WHERE to_regclass('public.relatorio_ciclo') IS NOT NULL
    UNION ALL SELECT 1 WHERE to_regclass('public.relatorio_conclusao') IS NOT NULL
    UNION ALL SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'public' AND p.proname IN
                 ('tem_capacidade','pode_ver_remuneracao_de','relatorio_faixa_para',
                  'relatorio_ciclo_janela','relatorio_ciclo_de','relatorio_resolver_conclusao')
  ) c
),
deps AS (
  SELECT count(*) FILTER (WHERE NOT ok) AS faltando FROM (
    SELECT to_regclass('public.demands')           IS NOT NULL AS ok
    UNION ALL SELECT to_regclass('public.demand_audit_logs') IS NOT NULL
    UNION ALL SELECT to_regclass('public.allowed_emails')    IS NOT NULL
    UNION ALL SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                              WHERE n.nspname='public' AND p.proname='get_my_role')
    UNION ALL SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                              WHERE n.nspname='public' AND p.proname='is_equipe')
    UNION ALL SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                              WHERE n.nspname='public' AND p.proname='update_updated_at_column')
    UNION ALL SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname='demand_status')
    UNION ALL SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname='demand_complexity')
  ) d
),
trig AS (
  SELECT string_agg(tgname, ' → ' ORDER BY tgname) AS ordem
  FROM pg_trigger
  WHERE tgrelid = 'public.demands'::regclass AND NOT tgisinternal
    AND (tgtype & 2) = 0 AND (tgtype & 16) > 0   -- AFTER ... UPDATE
)
SELECT * FROM (
  SELECT 1 AS n, 'Versão do Postgres' AS verificacao,
         current_setting('server_version') AS resultado,
         CASE WHEN current_setting('server_version_num')::int >= 90500
              THEN '✅' ELSE '❌' END AS v
  UNION ALL
  SELECT 2, 'gist suporta tstzrange (dispensa btree_gist)',
         (SELECT v::text FROM gist_ok),
         CASE WHEN (SELECT v FROM gist_ok) THEN '✅' ELSE '❌ EXCLUDE vai falhar' END
  UNION ALL
  SELECT 3, 'Dependências que a migration exige',
         (SELECT CASE WHEN faltando = 0 THEN 'todas presentes'
                      ELSE faltando::text || ' faltando' END FROM deps),
         CASE WHEN (SELECT faltando FROM deps) = 0 THEN '✅' ELSE '❌' END
  UNION ALL
  SELECT 4, 'Colisão de nome com objetos existentes',
         (SELECT CASE WHEN n = 0 THEN 'nenhuma' ELSE n::text || ' já existem' END FROM colisao),
         CASE WHEN (SELECT n FROM colisao) = 0 THEN '✅' ELSE '⚠️ conferir' END
  UNION ALL
  SELECT 5, 'Janela do ciclo (referência 09/2026)',
         (SELECT to_char(ini AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
                 || ' → ' ||
                 to_char(fim AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
                 || ' (exclusivo)' FROM janela),
         (SELECT CASE WHEN EXTRACT(DAY FROM ini AT TIME ZONE 'America/Sao_Paulo') = 20
                       AND EXTRACT(DAY FROM fim AT TIME ZONE 'America/Sao_Paulo') = 20
                      THEN '✅' ELSE '❌' END FROM janela)
  UNION ALL
  SELECT 6, 'Bordas do ciclo 20→19 (7 casos)',
         (SELECT passou::text || '/' || total::text || ' corretos' FROM bordas),
         (SELECT CASE WHEN passou = total THEN '✅' ELSE '❌' END FROM bordas)
  UNION ALL
  SELECT 7, 'Lógica das faixas (11 percentuais)',
         (SELECT passou::text || '/' || total::text || ' corretos' FROM faixa_res),
         (SELECT CASE WHEN passou = total THEN '✅' ELSE '❌' END FROM faixa_res)
  UNION ALL
  SELECT 8, 'Triggers AFTER UPDATE em demands (ordem real)',
         coalesce((SELECT ordem FROM trig), 'nenhum'),
         'ℹ️ o novo será trg_zz_relatorio_conclusao'
  UNION ALL
  SELECT 9, 'Demandas concluídas → data CONFIRMADA',
         (SELECT conf::text || ' de ' || total::text
                 || ' (' || coalesce(round(100.0*conf/NULLIF(total,0),1)::text,'0') || '%)' FROM conc),
         'ℹ️'
  UNION ALL
  SELECT 10, 'Demandas concluídas → NÃO IDENTIFICADA (triagem manual)',
         (SELECT naoid::text FROM conc), 'ℹ️'
  UNION ALL
  SELECT 11, 'Demandas reabertas (vale a última conclusão)',
         (SELECT n::text FROM reab), 'ℹ️'
  UNION ALL
  SELECT 12, 'Concluídas sem sistema identificado',
         (SELECT 'com slug: ' || com_slug || ' | só system_id: ' || so_id
                 || ' | sem nada: ' || sem || ' | total: ' || total FROM sis),
         'ℹ️'
) t ORDER BY n;
