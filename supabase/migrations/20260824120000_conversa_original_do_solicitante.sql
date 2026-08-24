-- ===========================================================================
-- A CONVERSA QUE ORIGINOU A DEMANDA
-- ===========================================================================
--
-- POR QUE ESTA TABELA EXISTE
--
-- Hoje a conversa com o Blink não é guardada em lugar nenhum. Quando a demanda
-- é criada, o que vai para `demands.description` é a versão que o Blink
-- escreveu — resumo mais descrição técnica. As palavras do solicitante são
-- descartadas no instante em que a demanda nasce.
--
-- Isso produziu um problema concreto e caro: uma solicitante descreveu o que
-- queria com as palavras dela, o Blink traduziu para linguagem técnica, a
-- equipe construiu a tradução, e não era o que ela tinha pedido. Na apuração,
-- o único artefato existente era o texto do Blink — e ele LÊ como se ela
-- tivesse escrito. Então pareceu que a equipe leu errado um pedido claro,
-- quando na verdade leu certo uma tradução errada.
--
-- O sistema tinha destruído a única prova capaz de mostrar isso.
--
-- Guardar a conversa transforma "memória contra memória" em leitura. E tem um
-- efeito de segunda ordem que importa mais que o primeiro: com o original
-- preservado, a PRECISÃO do Blink deixa de ser a única defesa. O erro dele
-- passa a ser detectável e barato. Sem o original, a precisão é tudo o que
-- existe — e ela nunca é 100%.
--
-- QUEM VÊ
-- Equipe e o próprio solicitante. Se a ideia é ela poder dizer "não foi isso
-- que pedi", ela precisa conseguir reler o que pediu — senão o registro só
-- existe de um lado, e a assimetria continua.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.demanda_conversa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id  uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,

  -- A posição na conversa. Não dá para confiar em `created_at` para ordenar:
  -- as linhas são gravadas em lote, no mesmo instante, e empatariam.
  ordem       smallint NOT NULL,

  papel       text NOT NULL,
  texto       text NOT NULL,

  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT dc_papel_valido CHECK (papel IN ('solicitante', 'blink')),
  CONSTRAINT dc_texto_nao_vazio CHECK (length(btrim(texto)) > 0),
  CONSTRAINT dc_ordem_unica UNIQUE (demanda_id, ordem)
);

CREATE INDEX IF NOT EXISTS demanda_conversa_por_demanda
  ON public.demanda_conversa (demanda_id, ordem);

ALTER TABLE public.demanda_conversa ENABLE ROW LEVEL SECURITY;

-- INSERT existe porque quem grava é o próprio solicitante, logo depois de
-- criar a demanda, com a sessão dele. Não há trigger nem service role no
-- caminho.
GRANT SELECT, INSERT ON public.demanda_conversa TO authenticated;
GRANT ALL ON public.demanda_conversa TO service_role;

/**
 * `can_view_demand()` já é exatamente o predicado certo — equipe, mais quem
 * abriu, mais o responsável — e já é usada para anexos e storage. Reusar em
 * vez de escrever regra nova mantém uma definição só de "quem enxerga esta
 * demanda": no dia em que ela mudar, muda para tudo junto.
 */
DROP POLICY IF EXISTS demanda_conversa_select ON public.demanda_conversa;
CREATE POLICY demanda_conversa_select ON public.demanda_conversa
  FOR SELECT TO authenticated
  USING (public.can_view_demand(demanda_id, auth.uid()));

-- Só quem abriu a demanda grava a conversa dela. A conversa é o registro do
-- que ESSA pessoa disse; ninguém escreve no lugar dela.
DROP POLICY IF EXISTS demanda_conversa_insert ON public.demanda_conversa;
CREATE POLICY demanda_conversa_insert ON public.demanda_conversa
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demands d
       WHERE d.id = demanda_id AND d.created_by = auth.uid()
    )
  );

-- SEM policy de UPDATE nem DELETE, e sem GRANT deles.
--
-- É a razão de a tabela existir: um registro que pode ser editado depois não
-- serve para resolver divergência sobre o que foi dito. A conversa é
-- testemunho, e testemunho não se corrige — quem quiser acrescentar algo
-- comenta na demanda, onde o comentário fica com autor e data próprios.
--
-- A exclusão em cascata a partir de `demands` continua valendo: apagar a
-- demanda apaga a conversa dela, o que é correto.

COMMENT ON TABLE public.demanda_conversa IS
  'Transcrição literal da conversa que originou a demanda. Imutável por desenho: é a única fonte do que o solicitante realmente disse, antes de a IA reescrever.';
