-- ===========================================================================
-- UM CAMPO BASTA
-- ===========================================================================
--
-- O QUE ESTAVA ERRADO — e o erro é de desenho meu, não de regra do negócio
--
-- `rft_concluido_exige_essencial` exigia QUATRO campos para registrar um
-- relato: problema identificado, solução implementada, o que foi alterado e
-- resultado obtido.
--
-- Isso nunca esteve na especificação. Fui eu que inventei, achando que mais
-- campos produziriam mais informação. Produzem o contrário.
--
-- O André mostrou o porquê com uma demanda real — "abrir na aba Resumo":
--
--   Problema:  a aba Resumo não abria por padrão
--   Solução:   fiz abrir por padrão
--   Alterado:  o padrão das abas
--   Resultado: abre no Resumo
--
-- Quatro maneiras de dizer a mesma frase. Não é registro, é cerimônia. E
-- multiplicada por 46 entregas vira trabalho que ninguém faz — o que é PIOR
-- que não ter campo nenhum, porque o módulo passa a parecer quebrado quando
-- na verdade está só intransitável.
--
-- O QUE FICA
--
-- Um campo obrigatório: `solucao_implementada` — como foi resolvido.
--
-- O registro continua completo porque `o_que_foi_solicitado` já vem
-- preenchido da descrição da demanda. Pedido + resolução é o par que permite
-- a quem não participou entender a entrega, que era o objetivo o tempo todo.
--
-- Os outros três continuam existindo e continuam sendo gravados quando
-- alguém escrever. Deixam de ser portão. Numa entrega grande — que mexeu em
-- banco, integração ou permissão — quem faz o relato tem interesse próprio em
-- detalhar, porque é o que sustenta uma classificação de Difícil.
--
-- O QUE NÃO MUDA
--
-- Continua sendo humano quem escreve (`rft_origem_humana`). Continua exigindo
-- fechamento registrado para classificar. Continua exigindo justificativa na
-- classificação. A trava que importa para o dinheiro — não se pontua o que
-- não está documentado — segue de pé; só deixou de custar quatro caixas de
-- texto por entrega.
-- ===========================================================================

ALTER TABLE public.relatorio_fechamento_tecnico
  DROP CONSTRAINT IF EXISTS rft_concluido_exige_essencial;

ALTER TABLE public.relatorio_fechamento_tecnico
  ADD CONSTRAINT rft_concluido_exige_solucao CHECK (
    situacao <> 'concluido'
    OR length(btrim(coalesce(solucao_implementada, ''))) > 0
  );

COMMENT ON CONSTRAINT rft_concluido_exige_solucao ON public.relatorio_fechamento_tecnico IS
  'Para registrar, basta descrever como foi resolvido. Os demais campos são opcionais: existem para quando houver o que dizer, não como formulário a preencher.';

COMMENT ON COLUMN public.relatorio_fechamento_tecnico.solucao_implementada IS
  'Como a demanda foi resolvida, nas palavras de quem resolveu. Único campo obrigatório para registrar o fechamento.';


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- A constraint velha não pode ter sobrado, e a nova precisa estar valendo.

SELECT
  conname                                   AS constraint_ativa,
  pg_get_constraintdef(oid)                 AS definicao
FROM pg_constraint
WHERE conrelid = 'public.relatorio_fechamento_tecnico'::regclass
  AND contype = 'c'
  AND conname LIKE 'rft_concluido%'
ORDER BY conname;
