-- Sistema: gestor-automacoesbloco (cgbhpenkytibgiosksrb)
-- PASSO 4 — liberar seu acesso e calcular as 46 datas de conclusão.
--
-- ESTE SCRIPT ESCREVE. Mas só nas tabelas novas do módulo:
--   * relatorio_capacidade  — quem pode ver o quê
--   * relatorio_conclusao   — a data de conclusão de cada demanda
--
-- NÃO toca em `demands`, não muda papel de ninguém em `allowed_emails`,
-- não dispara e-mail, não altera permissão existente.


-- ---------------------------------------------------------------------------
-- 4.1 — Seu acesso
-- ---------------------------------------------------------------------------
-- Todas as seis capacidades, porque você está construindo o módulo.
-- `on conflict do nothing` deixa rodar de novo sem erro.

INSERT INTO public.relatorio_capacidade (user_id, capacidade, concedida_por, concedida_por_email)
SELECT u.id, c.cap, u.id, u.email
  FROM auth.users u
 CROSS JOIN (VALUES
   ('relatorios.ver'),
   ('relatorios.gerar'),
   ('remuneracao.ver_propria'),
   ('remuneracao.ver_todas'),
   ('remuneracao.administrar'),
   ('classificacao.definir')
 ) c(cap)
 WHERE lower(u.email) = lower('andre.silva@grupobloco.com.br')
ON CONFLICT (user_id, capacidade) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 4.2 — As 46 datas de conclusão
-- ---------------------------------------------------------------------------
-- Lê `demand_audit_logs` de cada demanda concluída e grava a data com a
-- procedência. NÃO faz UPDATE em `demands` — só lê.
--
-- Para as 7 demandas reabertas, vale a ÚLTIMA transição para concluído.

SELECT public.relatorio_resolver_conclusoes_pendentes(500) AS datas_resolvidas;


-- ---------------------------------------------------------------------------
-- 4.3 — Conferir o resultado
-- ---------------------------------------------------------------------------

SELECT
  procedencia,
  count(*)                                   AS quantidade,
  to_char(min(data_conclusao) AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS mais_antiga,
  to_char(max(data_conclusao) AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS mais_recente
FROM public.relatorio_conclusao
GROUP BY procedencia
ORDER BY procedencia;


-- Quantas dessas 46 cairiam no primeiro ciclo (20/08 → 19/09).
-- Como estamos em 21/08, o esperado é um número pequeno.
SELECT
  c.rotulo                                                        AS ciclo,
  count(*) FILTER (WHERE rc.procedencia = 'confirmada'
                     AND rc.data_conclusao >= c.inicio
                     AND rc.data_conclusao <  c.fim)              AS dentro_do_ciclo,
  count(*) FILTER (WHERE rc.procedencia = 'confirmada'
                     AND rc.data_conclusao < c.inicio)            AS antes_do_ciclo,
  count(*)                                                        AS total_resolvidas
FROM public.relatorio_conclusao rc
CROSS JOIN public.relatorio_ciclo c
GROUP BY c.rotulo;


-- Suas capacidades, para confirmar que o acesso saiu.
SELECT
  u.email,
  string_agg(rc.capacidade, ', ' ORDER BY rc.capacidade) AS capacidades
FROM public.relatorio_capacidade rc
JOIN auth.users u ON u.id = rc.user_id
GROUP BY u.email;
