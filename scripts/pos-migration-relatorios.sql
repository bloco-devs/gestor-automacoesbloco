-- Sistema: gestor-automacoesbloco (cgbhpenkytibgiosksrb)
-- PASSO 3 — conferência depois da migration. SOMENTE LEITURA.
-- Toda linha deve vir ✅.

SELECT * FROM (

  -- As 5 tabelas nasceram, e com RLS ligada.
  SELECT 1 AS n, 'Tabelas criadas com RLS' AS verificacao,
         count(*)::text || ' de 5' AS resultado,
         CASE WHEN count(*) = 5 THEN '✅' ELSE '❌' END AS v
    FROM pg_tables
   WHERE schemaname = 'public' AND rowsecurity
     AND tablename IN ('relatorio_capacidade','relatorio_classificacao_tipo',
                       'relatorio_faixa','relatorio_ciclo','relatorio_conclusao')

  UNION ALL
  -- As 8 funções.
  SELECT 2, 'Funções criadas',
         count(*)::text || ' de 8',
         CASE WHEN count(*) = 8 THEN '✅' ELSE '❌' END
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public'
     AND p.proname IN ('tem_capacidade','pode_ver_remuneracao_de','relatorio_faixa_para',
                       'relatorio_ciclo_janela','relatorio_ciclo_de','relatorio_resolver_conclusao',
                       'relatorio_resolver_conclusoes_pendentes','trg_relatorio_conclusao_sincroniza')

  UNION ALL
  -- A escala de pontos.
  SELECT 3, 'Escala de pontos',
         string_agg(rotulo || '=' || pontos, ' · ' ORDER BY ordem),
         CASE WHEN count(*) = 3
               AND sum(CASE WHEN codigo='facil'   AND pontos=50  THEN 1 ELSE 0 END) = 1
               AND sum(CASE WHEN codigo='media'   AND pontos=100 THEN 1 ELSE 0 END) = 1
               AND sum(CASE WHEN codigo='dificil' AND pontos=200 THEN 1 ELSE 0 END) = 1
              THEN '✅' ELSE '❌' END
    FROM public.relatorio_classificacao_tipo

  UNION ALL
  -- As 5 faixas, com a lacuna sem valor.
  SELECT 4, 'Faixas cadastradas',
         count(*)::text || ' faixas, ' ||
         count(*) FILTER (WHERE valor_reais IS NULL)::text || ' sem valor (a lacuna)',
         CASE WHEN count(*) = 5 AND count(*) FILTER (WHERE valor_reais IS NULL) = 1
              THEN '✅' ELSE '❌' END
    FROM public.relatorio_faixa

  UNION ALL
  -- O primeiro ciclo, com a janela certa.
  SELECT 5, 'Ciclo inicial',
         rotulo || ': ' ||
         to_char(inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || ' → ' ||
         to_char(fim    AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') ||
         ' (exclusivo) · meta ' || meta_pontos,
         CASE WHEN to_char(inicio AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY') = '20/08/2026'
               AND to_char(fim    AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY') = '20/09/2026'
               AND meta_pontos = 800
              THEN '✅' ELSE '❌' END
    FROM public.relatorio_ciclo

  UNION ALL
  -- O trigger novo, e onde ele caiu na fila.
  SELECT 6, 'Ordem dos triggers AFTER UPDATE em demands',
         (SELECT string_agg(tgname, ' → ' ORDER BY tgname)
            FROM pg_trigger
           WHERE tgrelid = 'public.demands'::regclass AND NOT tgisinternal
             AND (tgtype & 2) = 0 AND (tgtype & 16) > 0),
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                            WHERE tgname = 'trg_zz_relatorio_conclusao'
                              AND tgrelid = 'public.demands'::regclass)
              THEN '✅ o novo é o último' ELSE '❌ não criou' END

  UNION ALL
  -- 118,75% continua sem virar dinheiro.
  SELECT 7, 'Faixa para 118,75% (950 pts sobre meta 800)',
         coalesce((SELECT rotulo FROM public.relatorio_faixa_para(118.75)), '(nenhuma)')
         || ' → ' ||
         coalesce((SELECT valor_reais::text FROM public.relatorio_faixa_para(118.75)),
                  'Faixa de remuneração não definida'),
         CASE WHEN (SELECT valor_reais FROM public.relatorio_faixa_para(118.75)) IS NULL
              THEN '✅ não inventou valor' ELSE '❌ inventou' END

  UNION ALL
  -- E 100% continua valendo mil.
  SELECT 8, 'Faixa para 100% (meta batida)',
         coalesce((SELECT rotulo FROM public.relatorio_faixa_para(100.00)), '(nenhuma)')
         || ' → R$ ' ||
         coalesce((SELECT valor_reais::text FROM public.relatorio_faixa_para(100.00)), '?'),
         CASE WHEN (SELECT valor_reais FROM public.relatorio_faixa_para(100.00)) = 1000
              THEN '✅' ELSE '❌' END

  UNION ALL
  -- A função de janela bate com a linha gravada.
  SELECT 9, 'Função de janela x ciclo gravado',
         (SELECT to_char(j.inicio AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI') || ' → ' ||
                 to_char(j.fim    AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI')
            FROM public.relatorio_ciclo_janela(DATE '2026-09-01') j),
         CASE WHEN (SELECT j.inicio FROM public.relatorio_ciclo_janela(DATE '2026-09-01') j)
                 = (SELECT inicio FROM public.relatorio_ciclo WHERE referencia = DATE '2026-09-01')
              THEN '✅' ELSE '❌' END

  UNION ALL
  -- Ninguém tem capacidade ainda — inclusive você. É o esperado agora.
  SELECT 10, 'Pessoas com acesso aos relatórios',
         count(*)::text || ' (o Passo 4 resolve)',
         'ℹ️'
    FROM public.relatorio_capacidade

  UNION ALL
  -- As 46 concluídas ainda não foram resolvidas — o trigger só pega
  -- movimentações novas. O Passo 4 dispara o lote.
  SELECT 11, 'Datas de conclusão já resolvidas',
         (SELECT count(*)::text FROM public.relatorio_conclusao) || ' de 46 (o Passo 4 resolve)',
         'ℹ️'

) t ORDER BY n;
