-- Sistema: gestor-automacoesbloco (cgbhpenkytibgiosksrb)
-- Conceder acesso ao RH e ao segundo desenvolvedor.
--
-- NÃO altera `allowed_emails.role` de ninguém. O RH continua `requester` e
-- segue abrindo e acompanhando chamados como sempre — as capacidades apenas
-- SOMAM ao papel operacional.


-- ---------------------------------------------------------------------------
-- PARTE 1 — as contas existem?
-- ---------------------------------------------------------------------------
-- Rode isto PRIMEIRO. Se um e-mail não aparecer, a conta nunca entrou no
-- sistema e o INSERT abaixo não faria nada — silenciosamente, sem erro.

SELECT
  e.email                                             AS email_procurado,
  CASE WHEN u.id IS NULL THEN '❌ conta não existe'
       ELSE '✅ encontrada' END                        AS conta,
  coalesce(ae.role, '— fora de allowed_emails')       AS papel_atual,
  coalesce(
    (SELECT string_agg(c.capacidade, ', ' ORDER BY c.capacidade)
       FROM public.relatorio_capacidade c WHERE c.user_id = u.id),
    'nenhuma'
  )                                                   AS capacidades_hoje
FROM (VALUES
  ('rh@grupobloco.com.br'),
  ('nielson.gomes@grupobloco.com.br'),
  ('andre.silva@grupobloco.com.br')
) e(email)
LEFT JOIN auth.users u          ON lower(u.email)  = lower(e.email)
LEFT JOIN public.allowed_emails ae ON lower(ae.email) = lower(e.email);


-- ---------------------------------------------------------------------------
-- PARTE 2 — RH
-- ---------------------------------------------------------------------------
-- Vê tudo, administra as regras, classifica. NÃO recebe
-- `remuneracao.ver_propria`: o RH não tem demandas próprias para receber por
-- elas, e capacidade que não serve para nada é superfície à toa.
--
-- E principalmente: NÃO vira administrador. Sem Centro de Secrets, sem gestão
-- de usuários, sem poder editar demanda ou alterar a complexidade da triagem
-- — que é a base do cálculo de pontos.

INSERT INTO public.relatorio_capacidade (user_id, capacidade, concedida_por, concedida_por_email)
SELECT u.id, c.cap, quem.id, quem.email
  FROM auth.users u
 CROSS JOIN (VALUES
   ('relatorios.ver'),
   ('relatorios.gerar'),
   ('remuneracao.ver_todas'),
   ('remuneracao.administrar'),
   ('classificacao.definir')
 ) c(cap)
 CROSS JOIN LATERAL (
   SELECT id, email FROM auth.users
    WHERE lower(email) = lower('andre.silva@grupobloco.com.br')
 ) quem
 WHERE lower(u.email) = lower('rh@grupobloco.com.br')
ON CONFLICT (user_id, capacidade) DO NOTHING;


-- ---------------------------------------------------------------------------
-- PARTE 3 — Nielson (segundo desenvolvedor)
-- ---------------------------------------------------------------------------
-- Vê o histórico técnico da equipe e a PRÓPRIA apuração. Não vê a de ninguém
-- mais: sem `remuneracao.ver_todas`, a consulta de apuração devolve só a
-- linha dele.

INSERT INTO public.relatorio_capacidade (user_id, capacidade, concedida_por, concedida_por_email)
SELECT u.id, c.cap, quem.id, quem.email
  FROM auth.users u
 CROSS JOIN (VALUES
   ('relatorios.ver'),
   ('remuneracao.ver_propria'),
   -- Classifica, inclusive as próprias entregas. Decisão do dono: os
   -- desenvolvedores julgam o próprio trabalho, por confiança. O sistema
   -- marca a autoclassificação para o RH poder revisar por amostragem.
   ('classificacao.definir')
 ) c(cap)
 CROSS JOIN LATERAL (
   SELECT id, email FROM auth.users
    WHERE lower(email) = lower('andre.silva@grupobloco.com.br')
 ) quem
 WHERE lower(u.email) = lower('nielson.gomes@grupobloco.com.br')
ON CONFLICT (user_id, capacidade) DO NOTHING;


-- ---------------------------------------------------------------------------
-- PARTE 4 — conferir o resultado
-- ---------------------------------------------------------------------------

SELECT
  u.email,
  coalesce(ae.role, '—')                                        AS papel_operacional,
  count(c.capacidade)                                           AS quantas,
  string_agg(c.capacidade, ', ' ORDER BY c.capacidade)          AS capacidades,
  CASE WHEN bool_or(c.capacidade = 'classificacao.definir')
       THEN 'classifica' ELSE '—' END                           AS classifica
FROM public.relatorio_capacidade c
JOIN auth.users u ON u.id = c.user_id
LEFT JOIN public.allowed_emails ae ON lower(ae.email) = lower(u.email)
GROUP BY u.email, ae.role
ORDER BY u.email;
