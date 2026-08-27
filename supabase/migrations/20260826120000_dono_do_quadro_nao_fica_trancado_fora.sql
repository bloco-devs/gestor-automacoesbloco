-- ===========================================================================
-- QUEM CRIA UM QUADRO NÃO PODE FICAR TRANCADO FORA DELE
-- ===========================================================================
--
-- O QUE O ANDRÉ VIU
--
-- Criou o quadro "RPA - Repositório de Robôs" e não encontrou como trocar o
-- plano de fundo nem como adicionar o outro desenvolvedor. Conseguia atribuir
-- pessoas ao CARTÃO, mas não ao quadro.
--
-- A CAUSA — e ela é uma discordância entre duas camadas
--
-- A tela esconde "Fundo" e "Configurações" atrás de:
--
--   canAdmin = resumo?.meuPapel === 'owner' || resumo?.meuPapel === 'admin'
--
-- `meuPapel` vem de `atividades_board_role`, que consulta SÓ
-- `atividades_board_membros`. Sem linha de membro, devolve nulo, e os dois
-- botões somem.
--
-- A assimetria que torna isso um defeito claro, e não uma escolha:
--
--   atividades_can_admin_board  →  has_role(admin) OR membro owner/admin
--   atividades_can_view_board   →  has_role(admin) OR público/workspace/membro
--   atividades_board_role       →  SÓ membro
--
-- A função que a TELA usa é a única sem o atalho de administrador global. Ou
-- seja: o banco aceitaria a operação e a interface esconde o botão. Quando as
-- duas camadas discordam, quem manda deveria ser o banco — a tela só reflete.
--
-- Nenhuma das três olha `criado_por`. A RPC de criação insere o criador como
-- `owner` (verificado nas quatro versões dela), então o caminho normal está
-- correto. Mas quadro que nasceu por outro caminho — importação, INSERT
-- direto, seed antigo — fica sem a linha, e o criador perde o próprio quadro.
--
-- POR QUE CORRIGIR NA FUNÇÃO E NÃO SÓ NOS DADOS
--
-- Reparar as linhas resolve os quadros de hoje. A função com fallback resolve
-- também os de amanhã, inclusive os criados por caminhos que ainda não
-- existem. Faço as duas coisas: o fallback é a regra, o reparo é a limpeza.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. O PAPEL PASSA A CONSIDERAR QUEM CRIOU
-- ---------------------------------------------------------------------------
/**
 * Ordem de precedência, do mais forte para o mais fraco:
 *
 *   1. A linha em `atividades_board_membros`, se existir. Ela é explícita e
 *      pode ter sido ajustada de propósito — se alguém rebaixou o criador a
 *      `member`, essa decisão vale mais que o fato de ele ter criado.
 *   2. `criado_por`. Quem criou é dono, mesmo sem linha.
 *   3. Administrador global. Não é dono do quadro, é `admin` — e a diferença
 *      importa: administrador enxerga e configura, mas o quadro continua
 *      pertencendo a quem criou.
 */
CREATE OR REPLACE FUNCTION public.atividades_board_role(
  _board_id uuid,
  _user_id  uuid DEFAULT auth.uid()
)
RETURNS public.atividades_board_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT m.role
       FROM public.atividades_board_membros m
      WHERE m.board_id = _board_id AND m.user_id = _user_id
      LIMIT 1),
    (SELECT 'owner'::public.atividades_board_role
       FROM public.atividades_boards b
      WHERE b.id = _board_id AND b.criado_por = _user_id
      LIMIT 1),
    (SELECT 'admin'::public.atividades_board_role
      WHERE _user_id IS NOT NULL
        AND private.has_role(_user_id, 'admin'::app_role))
  );
$$;


-- ---------------------------------------------------------------------------
-- 2. ADMINISTRAR E VER TAMBÉM
-- ---------------------------------------------------------------------------
-- Sem isto, o papel passaria a dizer 'owner' e a escrita continuaria recusada
-- — a tela mostraria o botão e a ação falharia, que é pior que o botão
-- escondido: promete e não cumpre.
CREATE OR REPLACE FUNCTION public.atividades_can_admin_board(
  _board_id uuid,
  _user_id  uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.atividades_boards b
       WHERE b.id = _board_id AND b.criado_por = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.atividades_board_membros m
       WHERE m.board_id = _board_id
         AND m.user_id  = _user_id
         AND m.role IN ('owner','admin')
    );
$$;

-- Quadro privado criado sem linha de membro ficava invisível para o próprio
-- criador: ele não conseguia nem abrir o que acabou de fazer.
CREATE OR REPLACE FUNCTION public.atividades_can_view_board(
  _board_id uuid,
  _user_id  uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.atividades_boards b
      WHERE b.id = _board_id
        AND (
          b.criado_por = _user_id
          OR b.visibilidade = 'public'
          OR (b.visibilidade = 'workspace' AND public.is_allowed_user())
          OR EXISTS (
            SELECT 1 FROM public.atividades_board_membros m
             WHERE m.board_id = _board_id AND m.user_id = _user_id
          )
        )
    );
$$;


-- ---------------------------------------------------------------------------
-- 3. REPARO DOS QUADROS QUE JÁ ESTÃO SEM A LINHA
-- ---------------------------------------------------------------------------
-- O fallback acima já resolve o acesso. Este INSERT existe para que o criador
-- APAREÇA na lista de membros e no contador — hoje um quadro dele conta zero
-- pessoas, o que faz parecer abandonado.
--
-- Não inventa dono: só toca quadro que tem `criado_por` preenchido. Os seeds
-- antigos, criados sem autor, ficam como estão — atribuir um dono a eles seria
-- decisão de negócio disfarçada de migração.
--
-- `ON CONFLICT DO NOTHING` protege quem já tem linha, inclusive quem foi
-- rebaixado de propósito.
INSERT INTO public.atividades_board_membros (board_id, user_id, role, convidado_por)
SELECT b.id, b.criado_por, 'owner', b.criado_por
  FROM public.atividades_boards b
 WHERE b.criado_por IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.atividades_board_membros m
      WHERE m.board_id = b.id AND m.user_id = b.criado_por
   )
ON CONFLICT (board_id, user_id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- Roda no SQL Editor: não usa `auth.uid()`, que ali é sempre nulo e foi o que
-- tornou a consulta anterior inconclusiva.
--
-- `sem_dono_registrado` precisa ser 0 depois desta migration, exceto para
-- quadros sem `criado_por` — esses aparecem com `tem_criador = false` e são o
-- caso que exige decisão humana sobre quem passa a ser o dono.

SELECT
  b.nome,
  b.visibilidade,
  (b.criado_por IS NOT NULL)                       AS tem_criador,
  count(m.user_id)                                 AS membros,
  count(*) FILTER (WHERE m.role IN ('owner','admin')) AS donos_ou_admins,
  CASE
    WHEN b.criado_por IS NULL THEN 'sem autor — precisa de decisão'
    WHEN count(*) FILTER (WHERE m.role IN ('owner','admin')) = 0 THEN 'ATENÇÃO: sem dono'
    ELSE 'ok'
  END                                              AS situacao
FROM public.atividades_boards b
LEFT JOIN public.atividades_board_membros m ON m.board_id = b.id
GROUP BY b.id, b.nome, b.visibilidade, b.criado_por
ORDER BY situacao DESC, b.nome;
