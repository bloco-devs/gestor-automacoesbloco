-- O CÓDIGO DO CHAMADO PASSA A VIR DO SLUG DO ECOSSISTEMA
--
-- POR QUE ISTO EXISTE
-- `demand_prefixo` montava o prefixo (RH, GP, OBR) consultando a tabela
-- `solucoes` pelo `system_id` da demanda. Duas coisas impediam isso de
-- funcionar, e nenhuma delas era óbvia:
--
--   1. `solucoes` está VAZIA. Zero linhas. A função consultava uma tabela que
--      nunca foi preenchida, então caía sempre no `RETURN 'REQ'` final.
--   2. `system_id` era sempre nulo, porque a IA devolve um SLUG do ecossistema
--      e aquela coluna é um uuid de `solucoes` — mandar um no outro derrubava
--      o insert com 22P02.
--
-- Resultado: todo chamado nascia `REQ-...`, que é o código de "não sei de que
-- sistema é isto". A IA acertava o sistema o tempo todo; o acerto morria no
-- caminho.
--
-- POR QUE PELO SLUG, E NÃO PREENCHENDO A `solucoes`
-- Os sistemas reais moram no HUB Bloco ID e são identificados por slug. Manter
-- uma cópia em `solucoes` significaria sincronizar duas listas na mão para
-- sempre — e no dia em que alguém cadastrasse um sistema novo no HUB e
-- esquecesse da cópia, o `REQ` voltaria em silêncio.
--
-- Guardando o slug direto na demanda, o catálogo do HUB continua sendo o único
-- que existe. Sistema novo lá funciona aqui sem ninguém fazer nada.
--
-- É SEGURO RODAR MAIS DE UMA VEZ.

BEGIN;

-- 1. Onde o slug passa a morar.
--
-- Sem chave estrangeira, de propósito: o catálogo é remoto e não há tabela
-- local para referenciar. Um slug que deixe de existir no HUB vira apenas um
-- prefixo `REQ` na próxima demanda, e não um erro de integridade que impede
-- alguém de abrir um chamado.
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS sistema_slug text;

-- 2. O prefixo passa a ler o slug.
--
-- A ordem dos testes importa: 'processos' precisa ser checado antes de
-- qualquer regra mais frouxa, e o casamento é por conteúdo porque os slugs do
-- HUB variam ('rh', 'gestor-rh', 'gestao-rh' são o mesmo departamento).
--
-- Slug desconhecido devolve 'REQ' — e isso é correto, não é falha. `REQ`
-- significa "sem sistema identificado", e essa continua sendo uma resposta
-- honesta e possível.
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

  IF s ~ '(^|[^a-z])rh([^a-z]|$)' OR s LIKE '%recursos-humanos%' OR s LIKE '%pessoal%' THEN
    RETURN 'RH';
  ELSIF s LIKE '%processo%' OR s LIKE '%sgpo%' THEN
    RETURN 'GP';
  ELSIF s LIKE '%obra%' THEN
    RETURN 'OBR';
  ELSIF s LIKE '%comercial%' OR s LIKE '%crm%' THEN
    RETURN 'COM';
  ELSIF s LIKE '%financ%' THEN
    RETURN 'FIN';
  ELSIF s LIKE '%suprimento%' OR s LIKE '%compras%' THEN
    RETURN 'SUP';
  ELSIF s LIKE '%automac%' OR s LIKE '%automat%' THEN
    RETURN 'AUT';
  END IF;

  RETURN 'REQ';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demand_prefixo_slug(text) FROM PUBLIC, anon;

-- 3. O gatilho passa a usar a função nova.
--
-- O resto do corpo é o mesmo de antes, inclusive o `pg_advisory_xact_lock`,
-- que é o que impede duas demandas criadas no mesmo segundo de receberem o
-- mesmo número.
CREATE OR REPLACE FUNCTION public.demands_set_ticket_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefixo text;
  v_aamm text;
  v_seq int;
BEGIN
  IF NEW.ticket_code IS NOT NULL AND NEW.ticket_code <> '' THEN
    RETURN NEW;
  END IF;

  v_prefixo := public.demand_prefixo_slug(NEW.sistema_slug);
  v_aamm := to_char(COALESCE(NEW.created_at, now()), 'YYMM');

  PERFORM pg_advisory_xact_lock(hashtext('demand_ticket_code:' || v_prefixo || v_aamm));

  SELECT COALESCE(MAX(substring(ticket_code from '([0-9]{4})$')::int), 0) + 1
    INTO v_seq
    FROM public.demands
   WHERE ticket_code LIKE v_prefixo || '-' || v_aamm || '-%';

  NEW.ticket_code := v_prefixo || '-' || v_aamm || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demands_set_ticket_code() FROM PUBLIC, anon, authenticated;

COMMIT;

-- O QUE NÃO ACONTECE AQUI
-- Os chamados que já existem continuam com o código que têm. Código de chamado
-- é o NOME dele: se alguém já escreveu "REQ-2607-0004" num e-mail, renumerar
-- apaga esse número do mundo. As demandas novas nascem certas; as antigas
-- ficam como estão.
