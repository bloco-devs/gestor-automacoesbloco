-- ===========================================================================
-- SLUG DE QUADRO PARA DE COMER ACENTO
-- ===========================================================================
--
-- COMO APARECEU
--
-- Ao conferir os quadros por outro motivo, os slugs saltaram aos olhos:
--
--   RPA - ONDA 0 (Fundação...)   →  rpa-onda-0-funda-o-infraestrutura-e-base
--   Camada de Exceção IA...      →  camada-de-exce-o-ia-diagn-stica
--   Painel no Gestor de Automações → painel-no-gestor-de-automa-es
--   Módulo AVD...                →  m-dulo-avd-...
--
-- Todo caractere acentuado virou hífen. `fundação` deveria dar `fundacao`.
--
-- A CAUSA
--
--   v_slug := lower(regexp_replace(coalesce(_nome,'quadro'), '[^a-zA-Z0-9]+', '-', 'g'))
--
-- `[^a-zA-Z0-9]` classifica `ç`, `ã` e `ó` como caractere não permitido, do
-- mesmo jeito que classifica espaço e parêntese — então troca por hífen. Em
-- inglês a regra funciona; em português ela apaga metade das palavras.
--
-- POR QUE `translate` E NÃO `unaccent`
--
-- `unaccent` resolveria em uma linha, mas é extensão: exige estar instalada e
-- no `search_path` da função, que é fixo em `public`. Uma função de criação de
-- quadro que falha porque uma extensão não subiu no restore é pior que um
-- slug feio. `translate` é do core e é determinístico.
--
-- OS SLUGS EXISTENTES NÃO MUDAM
--
-- Slug entra em URL. Renomear os oito quadros agora quebraria todo link já
-- compartilhado ou salvo por alguém, para trocar um traço por uma letra. O
-- defeito é cosmético e o conserto seria destrutivo — corrige daqui para a
-- frente, e os antigos ficam como testemunho de quando isso foi arrumado.
-- ===========================================================================

/**
 * Transliteração de acento para ASCII.
 *
 * `translate` opera por caractere (não por byte) em bancos UTF-8, então o
 * mapeamento é posição a posição: cada caractere da primeira lista vira o da
 * mesma posição na segunda. As duas listas PRECISAM ter o mesmo comprimento —
 * se divergirem, os caracteres sobrando são simplesmente removidos, em
 * silêncio, e o defeito volta com outra cara.
 */
CREATE OR REPLACE FUNCTION public.sem_acento(_texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public, pg_temp
AS $$
  SELECT translate(
    _texto,
    'áàâãäåéèêëíìîïóòôõöúùûüçñýÿÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝ',
    'aaaaaaeeeeiiiiooooouuuucnyyAAAAAAEEEEIIIIOOOOOUUUUCNY'
  );
$$;

COMMENT ON FUNCTION public.sem_acento(text) IS
  'Transliteração de acento para ASCII, usando translate do core em vez da extensão unaccent. Base para geração de slug.';


-- ---------------------------------------------------------------------------
-- A criação de quadro, com o slug corrigido
-- ---------------------------------------------------------------------------
-- Recriada por inteiro a partir da versão de 20260730172547. A ÚNICA
-- diferença é a linha do `v_slug`; todo o resto — validações, membro owner,
-- as três colunas, o histórico — vai igual, de propósito, para o diff mostrar
-- exatamente o que mudou.
CREATE OR REPLACE FUNCTION public.atividades_create_board(
  _nome text,
  _descricao text DEFAULT NULL,
  _visibilidade text DEFAULT 'workspace',
  _cor text DEFAULT NULL,
  _icone text DEFAULT NULL,
  _background text DEFAULT NULL,
  _workspace_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ws  uuid;
  v_id  uuid;
  v_slug text;
  v_key_suffix text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;
  IF NOT public.is_allowed_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _visibilidade NOT IN ('private','workspace','public') THEN
    RAISE EXCEPTION 'invalid visibilidade' USING ERRCODE='22023';
  END IF;

  v_ws := COALESCE(_workspace_id, (SELECT id FROM public.atividades_workspaces WHERE slug='grupo-bloco'));

  -- A LINHA QUE MUDOU. `sem_acento` roda ANTES do regexp: assim `ç` já virou
  -- `c` quando a expressão decide o que é caractere válido.
  -- O `btrim` no fim remove o hífen sobrando quando o nome termina em
  -- pontuação — "Manutenção Final)" gerava um traço solto no fim.
  v_slug := btrim(
              lower(regexp_replace(public.sem_acento(coalesce(_nome,'quadro')),
                                   '[^a-zA-Z0-9]+', '-', 'g')),
              '-')
            || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.atividades_boards (slug, nome, descricao, cor, icone, background, visibilidade, workspace_id, criado_por, ordem)
  VALUES (v_slug, _nome, _descricao, _cor, _icone, _background, _visibilidade, v_ws, v_uid,
          COALESCE((SELECT max(ordem)+1 FROM public.atividades_boards), 0))
  RETURNING id INTO v_id;

  INSERT INTO public.atividades_board_membros (board_id, user_id, role, convidado_por)
  VALUES (v_id, v_uid, 'owner', v_uid)
  ON CONFLICT (board_id, user_id) DO NOTHING;

  -- A tabela atividades_colunas possui chave unica global herdada; por isso o
  -- sufixo com os 8 primeiros caracteres do id do board.
  v_key_suffix := substr(v_id::text, 1, 8);

  INSERT INTO public.atividades_colunas (board_id, chave, nome, ordem) VALUES
    (v_id, 'a-fazer-'      || v_key_suffix, 'A Fazer',       1),
    (v_id, 'em-andamento-' || v_key_suffix, 'Em Andamento',  2),
    (v_id, 'concluido-'    || v_key_suffix, 'Concluído',     3);

  INSERT INTO public.atividades_board_historico (board_id, user_id, evento, payload)
  VALUES (v_id, v_uid, 'board_criado', jsonb_build_object('nome', _nome));

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atividades_create_board(text,text,text,text,text,text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atividades_create_board(text,text,text,text,text,text,uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.atividades_create_board(text,text,text,text,text,text,uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- Compara o slug que a regra VELHA geraria com o da regra NOVA, usando os
-- nomes reais dos quadros. A coluna `mudou` mostra onde o acento estava sendo
-- comido. Nada é alterado — os slugs gravados continuam como estão.

SELECT
  b.nome,
  lower(regexp_replace(b.nome, '[^a-zA-Z0-9]+', '-', 'g'))                    AS regra_antiga,
  btrim(lower(regexp_replace(public.sem_acento(b.nome), '[^a-zA-Z0-9]+', '-', 'g')), '-')
                                                                              AS regra_nova,
  (lower(regexp_replace(b.nome, '[^a-zA-Z0-9]+', '-', 'g'))
     <> btrim(lower(regexp_replace(public.sem_acento(b.nome), '[^a-zA-Z0-9]+', '-', 'g')), '-'))
                                                                              AS mudou
FROM public.atividades_boards b
ORDER BY mudou DESC, b.nome;
