-- ============================================================================
-- O DESTINO "TECNOLOGIA" NO CÓDIGO DO CHAMADO
--
-- `demand_prefixo_slug` devolve `REQ` para tudo que ela não reconhece, e `REQ`
-- quer dizer "não sei de que sistema é isto". Com o destino Tecnologia, passa
-- a existir uma demanda que legitimamente não é de sistema nenhum — e chamá-la
-- de REQ seria registrar como ausência de resposta o que é uma resposta.
--
-- Uma linha, e só ela: o resto da função tem defeitos conhecidos (ela casa por
-- LIKE no slug e só reconhece 5 dos 16 sistemas do HUB, então 11 nascem REQ),
-- mas consertar isso muda o prefixo de chamados já emitidos e é decisão do
-- André. Esta migration não encosta nesse assunto.
--
-- Sem ela nada quebra: a tela já reescreve `REQ-` para `TEC-` pelo slug
-- gravado. O que ela conserta é o valor guardado no banco, que é o que vale
-- quando alguém consulta a tabela direto.
-- ============================================================================

BEGIN;

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
  -- Exato, e ANTES dos LIKE: "tecnologia" é um slug fechado, não uma família
  -- de palavras. Deixá-lo no meio dos LIKE o exporia a casamento por pedaço.
  IF s = 'tecnologia' THEN
    RETURN 'TEC';
  END IF;
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

COMMIT;
