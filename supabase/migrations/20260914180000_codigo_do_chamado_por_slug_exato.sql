-- ============================================================================
-- O CODIGO DO CHAMADO PASSA A SAIR DO SLUG EXATO, E OS JA EMITIDOS SAO
-- ALINHADOS AO QUE A TELA JA MOSTRA.
--
-- O QUE ESTAVA ERRADO
--
-- `demand_prefixo_slug` casava por LIKE em familias de palavras (%obra%,
-- %financ%, ...). Os slugs sao nomes internos e quase nenhum contem essas
-- palavras: `locacao` nao contem "suprimento", `fluxo-caixa` nao contem
-- "financ", `produtividade` nao contem "obra". Resultado medido em producao:
-- 81 das 95 demandas nasceram com o prefixo generico `REQ`, que quer dizer
-- "nao sei de que sistema e isto" — mesmo com o sistema gravado ao lado.
--
-- A tela disfarcava: ela reescreve prefixo generico usando o catalogo de
-- siglas do front. Entao o usuario via OBRA-2608-0002 e o banco guardava
-- REQ-2608-0002. Quem consultava a tabela direto via outra coisa.
--
-- POR QUE ESTA MIGRATION E SEGURA DE RODAR
--
-- Conferido antes de escrever, com os dados reais:
--
--   nenhuma demanda esta congelada em ciclo fechado (`ja_apuradas` = 0 em
--   todas), entao nenhum snapshot de apuracao diverge;
--   nenhuma tem `sistema_slug` nulo, entao nao ha linha sem resposta certa;
--   nao existe demanda de `crm-house`, que era o unico caso em que o codigo
--   exibido pertencia a OUTRO sistema;
--   as 8 conversoes foram comparadas uma a uma contra
--   `formatarReferenciaComSigla`: o codigo exibido HOJE e identico ao que
--   passa a ser gravado. A correcao e INVISIVEL para quem usa o sistema —
--   nenhuma referencia que alguem tenha anotado ou citado deixa de existir.
--
-- Os gatilhos de `demands` foram verificados: `demands_mensagem_de_boas_vindas`
-- e AFTER INSERT e `trg_demands_ticket_code` e BEFORE INSERT, entao o UPDATE
-- nao dispara mensagem nem renumera nada.
--
-- POR QUE `processos` CONTINUA `GP` E `automacoes` CONTINUA `AUT`
--
-- Sao os prefixos que as 6 demandas desses dois sistemas JA carregam, e que ja
-- circulam citados (ha uma `GP-2608-0010` referenciada ate dentro do codigo).
-- O catalogo do front chama esses sistemas de SGPO e AUTO, mas essa sigla so e
-- usada para a COR do cracha — o codigo nunca e reescrito quando o prefixo ja
-- e real. Trocar por SGPO/AUTO quebraria citacao viva para ganhar consistencia
-- cosmetica, e nao ha um unico defeito real nesses dois.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. A regra: mapa exato, nao familia de palavras
-- ---------------------------------------------------------------------------
--
-- ATENCAO: sistema novo no HUB precisa entrar AQUI tambem, senao as demandas
-- dele nascem `REQ`. Ha um teste em `siglaDoSistema.test.ts` que le este
-- arquivo e reprova se este mapa divergir do catalogo do front.
--
-- Slug desconhecido devolve `REQ` de proposito: `REQ` e a resposta honesta
-- para "nao sei a sigla deste sistema". Chutar por pedaco de palavra foi
-- exatamente o que produziu o defeito que esta migration corrige.

CREATE OR REPLACE FUNCTION public.demand_prefixo_slug(_slug text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF _slug IS NULL OR btrim(_slug) = '' THEN
    RETURN 'REQ';
  END IF;
  s := lower(btrim(_slug));

  RETURN CASE s
    WHEN 'crm-house'               THEN 'CRM'
    WHEN 'desenvolvimento-produto' THEN 'PROD'
    WHEN 'nakhon-contratos'        THEN 'CONT'
    WHEN 'gestao-comercial'        THEN 'COM'
    WHEN 'captacao'                THEN 'CAP'
    WHEN 'incorporacao'            THEN 'INC'
    WHEN 'produtividade'           THEN 'OBRA'
    WHEN 'processos'               THEN 'GP'
    WHEN 'rh'                      THEN 'RH'
    WHEN 'locacao'                 THEN 'SUPR'
    WHEN 'fluxo-caixa'             THEN 'FIN'
    WHEN 'atividades'              THEN 'ATIV'
    WHEN 'automacoes'              THEN 'AUT'
    WHEN 'portfolio'               THEN 'PORT'
    WHEN 'sucesso-cliente'         THEN 'CS'
    WHEN 'viabilidade'             THEN 'VIAB'
    WHEN 'tecnologia'              THEN 'TEC'
    ELSE 'REQ'
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demand_prefixo_slug(text) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 2. Colisao: avisar ANTES, em vez de estourar no indice unico
-- ---------------------------------------------------------------------------
--
-- `demands_ticket_code_key` ja impede duplicata, e um estouro dele desfaz a
-- transacao inteira — o comportamento certo. Mas a mensagem seria cripitica.
-- Este bloco nomeia os conflitos antes de qualquer escrita.

DO $$
DECLARE
  v_conflitos text;
BEGIN
  SELECT string_agg(novo, ', ')
    INTO v_conflitos
  FROM (
    SELECT public.demand_prefixo_slug(d.sistema_slug)
           || '-' || split_part(d.ticket_code, '-', 2)
           || '-' || split_part(d.ticket_code, '-', 3) AS novo
    FROM public.demands d
    WHERE d.deleted_at IS NULL
      AND d.sistema_slug IS NOT NULL
      AND split_part(d.ticket_code, '-', 1) IN ('REQ', 'REC', 'TI')
      AND public.demand_prefixo_slug(d.sistema_slug) NOT IN ('REQ', 'REC', 'TI')
  ) AS alvo
  WHERE EXISTS (SELECT 1 FROM public.demands x WHERE x.ticket_code = alvo.novo);

  IF v_conflitos IS NOT NULL THEN
    RAISE EXCEPTION 'codigo de destino ja existe: %', v_conflitos;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. O UPDATE
-- ---------------------------------------------------------------------------
--
-- `demands_set_updated_at` e BEFORE UPDATE e carimbaria as 81 como editadas
-- agora. Corrigir o que estava guardado errado nao e editar a demanda, e um
-- painel legado usa `updated_at` como proxy de conclusao (ver o comentario em
-- `relatorios_fundacao`). Desligar o gatilho durante a correcao evita inventar
-- 81 edicoes que nunca aconteceram.
--
-- Se o papel nao tiver permissao para isso, a correcao acontece do mesmo jeito
-- e so o carimbo se move.

DO $$
BEGIN
  ALTER TABLE public.demands DISABLE TRIGGER demands_set_updated_at;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'sem permissao para desligar demands_set_updated_at; updated_at sera carimbado';
END $$;

UPDATE public.demands d
   SET ticket_code = public.demand_prefixo_slug(d.sistema_slug)
                  || '-' || split_part(d.ticket_code, '-', 2)
                  || '-' || split_part(d.ticket_code, '-', 3)
 WHERE d.deleted_at IS NULL
   AND d.sistema_slug IS NOT NULL
   -- so prefixo generico: codigo que ja nomeia um sistema nao se toca
   AND split_part(d.ticket_code, '-', 1) IN ('REQ', 'REC', 'TI')
   AND public.demand_prefixo_slug(d.sistema_slug) NOT IN ('REQ', 'REC', 'TI')
   -- forma esperada; qualquer codigo fora do padrao fica como esta
   AND d.ticket_code ~ '^[A-Z]+-[0-9]{4}-[0-9]{4}$';

DO $$
BEGIN
  ALTER TABLE public.demands ENABLE TRIGGER demands_set_updated_at;
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4. A migration confere o proprio resultado
-- ---------------------------------------------------------------------------
--
-- Sobrar demanda com prefixo generico e sistema conhecido significa que o
-- UPDATE nao pegou o que devia. Melhor desfazer tudo do que deixar metade.

DO $$
DECLARE
  v_restantes int;
BEGIN
  SELECT count(*)
    INTO v_restantes
    FROM public.demands
   WHERE deleted_at IS NULL
     AND sistema_slug IS NOT NULL
     AND split_part(ticket_code, '-', 1) IN ('REQ', 'REC', 'TI')
     AND public.demand_prefixo_slug(sistema_slug) NOT IN ('REQ', 'REC', 'TI')
     AND ticket_code ~ '^[A-Z]+-[0-9]{4}-[0-9]{4}$';

  IF v_restantes > 0 THEN
    RAISE EXCEPTION 'restaram % demandas com prefixo generico e sistema conhecido', v_restantes;
  END IF;
END $$;

COMMIT;
