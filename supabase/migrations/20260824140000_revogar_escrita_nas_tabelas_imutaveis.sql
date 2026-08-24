-- ===========================================================================
-- REVOGAR O QUE EU ACHEI QUE NUNCA TINHA CONCEDIDO
-- ===========================================================================
--
-- O ERRO
--
-- Nas migrations do módulo de relatórios e na da conversa, eu escrevi coisas
-- como `GRANT SELECT ON tabela TO authenticated` e comentei que a tabela era
-- imutável "porque não há GRANT de UPDATE nem DELETE".
--
-- `GRANT` é ADITIVO. Ele não revoga o que já existe. Este projeto concede
-- privilégios amplos a `authenticated` em tabela nova, então conceder um
-- subconjunto não restringiu nada — as tabelas nasceram com UPDATE e DELETE
-- disponíveis, ao contrário do que os comentários afirmam.
--
-- O QUE SALVOU
--
-- A RLS. Com row level security ligada e NENHUMA policy permissiva para uma
-- operação, o Postgres nega essa operação — grant ou não. Nenhuma linha foi
-- editada ou apagada, e o snapshot dos ciclos nunca esteve de fato exposto.
--
-- POR QUE MESMO ASSIM ISTO IMPORTA
--
-- A proteção estava numa camada só, e a camada errada para o propósito. No
-- dia em que alguém acrescentar uma policy `FOR ALL` — que é o atalho natural
-- de quem precisa liberar uma escrita específica com pressa — o grant volta a
-- ser a última linha, e ele está aberto. Revogar aqui faz a segunda camada
-- existir de verdade, e não só nos comentários.
--
-- Nada nesta migration muda comportamento observável hoje. Ela fecha uma
-- porta que a RLS já estava segurando.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A CONVERSA — testemunho não se corrige
-- ---------------------------------------------------------------------------
-- INSERT continua, porque é o solicitante que grava a própria conversa logo
-- depois de criar a demanda.
REVOKE UPDATE, DELETE, TRUNCATE ON public.demanda_conversa FROM authenticated;


-- ---------------------------------------------------------------------------
-- 2. O SNAPSHOT DO CICLO — livro-caixa
-- ---------------------------------------------------------------------------
-- Escrita exclusivamente pelas RPCs de fechar e reabrir, que rodam como
-- definer. Nem INSERT pela interface.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_ciclo_item      FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_ciclo_resultado FROM authenticated;


-- ---------------------------------------------------------------------------
-- 3. CLASSIFICAÇÃO E SEU HISTÓRICO
-- ---------------------------------------------------------------------------
-- `relatorio_classificar()` é o único caminho de escrita, e é o que garante
-- que toda alteração gere linha de histórico com motivo. Deixar UPDATE direto
-- aberto seria deixar um desvio ao lado da única porta auditada.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_classificacao            FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_classificacao_historico  FROM authenticated;


-- ---------------------------------------------------------------------------
-- 4. A RESOLUÇÃO DE DATA
-- ---------------------------------------------------------------------------
-- Quem escreve é o resolvedor e o trigger. Uma data de conclusão editável à
-- mão pela interface tiraria o sentido da coluna `procedencia`.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_conclusao FROM authenticated;


-- ---------------------------------------------------------------------------
-- 5. AS CAPACIDADES
-- ---------------------------------------------------------------------------
-- Conceder a si mesmo `remuneracao.ver_todas` seria a escalada de privilégio
-- mais direta possível neste módulo. Escrita só por administrador no SQL ou
-- por RPC futura.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.relatorio_capacidade FROM authenticated;


-- ---------------------------------------------------------------------------
-- 6. AS TABELAS DE CONFIGURAÇÃO — DELETE não, edição sim
-- ---------------------------------------------------------------------------
-- Faixa, escala de pontos e ciclo SÃO editáveis por quem tem a capacidade de
-- administrar remuneração — é a RLS que decide isso, e continua decidindo.
--
-- Mas DELETE nunca deveria estar disponível: faixa e categoria saem de uso
-- por `ativo` ou `vigencia_fim`, e ciclo é histórico. Apagar a linha faria um
-- ciclo já apurado perder a regra que valia na época dele.
REVOKE DELETE, TRUNCATE ON public.relatorio_faixa               FROM authenticated;
REVOKE DELETE, TRUNCATE ON public.relatorio_classificacao_tipo  FROM authenticated;
REVOKE DELETE, TRUNCATE ON public.relatorio_ciclo               FROM authenticated;


-- ---------------------------------------------------------------------------
-- 7. FECHAMENTO TÉCNICO E TEMPO — o que continua aberto, e por quê
-- ---------------------------------------------------------------------------
-- `relatorio_fechamento_tecnico` mantém INSERT e UPDATE: o relato técnico é
-- editável para sempre, de propósito. A verdade técnica pode melhorar; o que
-- foi pago é que não muda, e isso o snapshot já protege.
--
-- `relatorio_intervalo` mantém tudo, inclusive DELETE: cada pessoa corrige o
-- próprio lançamento de horas, e a policy já garante que só o dono mexe.
REVOKE TRUNCATE ON public.relatorio_fechamento_tecnico FROM authenticated;
REVOKE TRUNCATE ON public.relatorio_intervalo          FROM authenticated;


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- Devolve uma linha por tabela do módulo, dizendo o que `authenticated` pode
-- fazer em cada uma. Compare com a intenção descrita acima.

SELECT
  t.tabela,
  CASE WHEN has_table_privilege('authenticated', 'public.' || t.tabela, 'SELECT') THEN 'sim' ELSE '—' END AS ler,
  CASE WHEN has_table_privilege('authenticated', 'public.' || t.tabela, 'INSERT') THEN 'sim' ELSE '—' END AS inserir,
  CASE WHEN has_table_privilege('authenticated', 'public.' || t.tabela, 'UPDATE') THEN 'sim' ELSE '—' END AS editar,
  CASE WHEN has_table_privilege('authenticated', 'public.' || t.tabela, 'DELETE') THEN 'sim' ELSE '—' END AS apagar
FROM (VALUES
  ('demanda_conversa'),
  ('relatorio_capacidade'),
  ('relatorio_classificacao'),
  ('relatorio_classificacao_historico'),
  ('relatorio_classificacao_tipo'),
  ('relatorio_ciclo'),
  ('relatorio_ciclo_item'),
  ('relatorio_ciclo_resultado'),
  ('relatorio_conclusao'),
  ('relatorio_faixa'),
  ('relatorio_fechamento_tecnico'),
  ('relatorio_intervalo')
) t(tabela)
ORDER BY t.tabela;
