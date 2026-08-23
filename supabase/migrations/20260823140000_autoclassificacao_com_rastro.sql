-- ===========================================================================
-- O DESENVOLVEDOR CLASSIFICA A PRÓPRIA ENTREGA
-- ===========================================================================
--
-- POR QUE A TRAVA ANTERIOR SAIU
--
-- A versão de 21/08 recusava classificar a própria demanda, sem exceção. A
-- premissa era que quem executa não deve decidir quanto o próprio trabalho
-- valeu — princípio comum em remuneração variável.
--
-- Só que a decisão de negócio é outra, e é do dono: os desenvolvedores
-- classificam as próprias entregas, por confiança. O RH não conhece o
-- suficiente do trabalho técnico para julgar escopo, risco e impacto, e forçar
-- que julgue produziria classificação pior, não mais imparcial.
--
-- Então a trava sai. Mas o RASTRO não.
--
-- POR QUE MARCAR EM VEZ DE SÓ LIBERAR
--
-- Se a autoclassificação simplesmente passasse a ser permitida, nada no banco
-- distinguiria depois uma entrega julgada pelo próprio autor de uma julgada
-- por outra pessoa. No dia em que alguém questionar um número — e em
-- remuneração variável esse dia chega — não haveria como responder.
--
-- Confiança e registro não são opostos: o registro é o que permite manter a
-- confiança quando ela for testada. Quem classifica a própria entrega segue
-- podendo; o sistema só anota que foi assim, e o RH consegue revisar por
-- amostragem sem precisar bloquear ninguém.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A MARCA
-- ---------------------------------------------------------------------------
-- Gravada, não calculada. `demands.assigned_to` pode mudar depois — trocar o
-- responsável em outubro não pode reescrever a natureza de uma decisão tomada
-- em agosto.

ALTER TABLE public.relatorio_classificacao
  ADD COLUMN IF NOT EXISTS autoclassificada boolean NOT NULL DEFAULT false;

ALTER TABLE public.relatorio_classificacao_historico
  ADD COLUMN IF NOT EXISTS autoclassificada boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.relatorio_classificacao.autoclassificada IS
  'Verdadeiro quando quem classificou é o responsável pela demanda. Permitido por decisão de negócio; registrado para permitir revisão por amostragem.';

CREATE INDEX IF NOT EXISTS relatorio_classificacao_auto
  ON public.relatorio_classificacao (autoclassificada) WHERE autoclassificada;


-- ---------------------------------------------------------------------------
-- 2. A RPC, SEM A TRAVA E COM A MARCA
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.relatorio_classificar(
  _demanda_id    uuid,
  _classificacao text,
  _justificativa text,
  _motivo        text DEFAULT NULL
)
RETURNS public.relatorio_classificacao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_email       text;
  v_pontos      integer;
  v_anterior    public.relatorio_classificacao;
  v_responsavel uuid;
  v_auto        boolean;
  v_fechado     boolean;
  v_saida       public.relatorio_classificacao;
BEGIN
  IF NOT public.tem_capacidade('classificacao.definir') THEN
    RAISE EXCEPTION 'Sem permissão para classificar.'
      USING HINT = 'É preciso a capacidade classificacao.definir.';
  END IF;

  SELECT d.assigned_to INTO v_responsavel
    FROM public.demands d WHERE d.id = _demanda_id AND d.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada.';
  END IF;

  -- Antes isto levantava exceção. Agora só marca.
  v_auto := (v_responsavel IS NOT NULL AND v_responsavel = v_uid);

  -- O fechamento técnico continua sendo requisito: sem o relato não há base
  -- para julgar escopo, impacto ou risco — e isso não muda com quem julga.
  SELECT (f.situacao = 'concluido') INTO v_fechado
    FROM public.relatorio_fechamento_tecnico f WHERE f.demanda_id = _demanda_id;
  IF coalesce(v_fechado, false) = false THEN
    RAISE EXCEPTION 'O fechamento técnico desta demanda ainda não foi concluído.'
      USING HINT = 'Registre problema, solução, alterações e resultado antes de classificar.';
  END IF;

  SELECT t.pontos INTO v_pontos
    FROM public.relatorio_classificacao_tipo t
   WHERE t.codigo = _classificacao AND t.ativo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Classificação inválida ou inativa: %', _classificacao;
  END IF;

  -- A justificativa continua obrigatória, e AGORA ela pesa mais do que antes.
  -- Quando quem decide é quem executou, o texto é a única coisa que sustenta
  -- a decisão para quem vier conferir depois.
  IF length(btrim(coalesce(_justificativa, ''))) < 15 THEN
    RAISE EXCEPTION 'A justificativa é obrigatória e precisa explicar a decisão.'
      USING HINT = 'Diga por que o escopo, o impacto ou o risco levam a esta classificação.';
  END IF;

  SELECT * INTO v_anterior FROM public.relatorio_classificacao
   WHERE demanda_id = _demanda_id;

  IF FOUND AND length(btrim(coalesce(_motivo, ''))) < 10 THEN
    RAISE EXCEPTION 'Alterar uma classificação existente exige o motivo da mudança.'
      USING HINT = format('Hoje está %s. Explique o que mudou no entendimento.',
                          v_anterior.classificacao);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.relatorio_classificacao AS rc
    (demanda_id, classificacao, pontos, justificativa,
     definido_por, definido_por_email, autoclassificada)
  VALUES
    (_demanda_id, _classificacao, v_pontos, btrim(_justificativa),
     v_uid, v_email, v_auto)
  ON CONFLICT (demanda_id) DO UPDATE SET
    classificacao      = EXCLUDED.classificacao,
    pontos             = EXCLUDED.pontos,
    justificativa      = EXCLUDED.justificativa,
    definido_por       = EXCLUDED.definido_por,
    definido_por_email = EXCLUDED.definido_por_email,
    autoclassificada   = EXCLUDED.autoclassificada,
    definido_em        = now(),
    updated_at         = now()
  RETURNING rc.* INTO v_saida;

  INSERT INTO public.relatorio_classificacao_historico
    (demanda_id, origem,
     classificacao_de, classificacao_para, pontos_de, pontos_para,
     justificativa, motivo_da_alteracao, alterado_por, alterado_por_email,
     autoclassificada)
  VALUES
    (_demanda_id,
     CASE WHEN v_anterior.demanda_id IS NULL THEN 'definicao' ELSE 'alteracao' END,
     v_anterior.classificacao, _classificacao,
     v_anterior.pontos, v_pontos,
     btrim(_justificativa),
     CASE WHEN v_anterior.demanda_id IS NULL THEN NULL ELSE btrim(_motivo) END,
     v_uid, v_email, v_auto);

  RETURN v_saida;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_classificar(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_classificar(uuid, text, text, text)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 3. A CONSULTA DE REVISÃO POR AMOSTRAGEM
-- ---------------------------------------------------------------------------
-- É o que torna a confiança verificável em vez de cega. O RH abre, vê o que
-- foi autoclassificado no ciclo, lê a justificativa, e ajusta o que discordar
-- — sem precisar julgar tudo nem bloquear ninguém.
--
-- Predicado de remuneração, não `is_equipe()`: quem revisa vê a decisão e o
-- valor em pontos, então é dado sensível.

CREATE OR REPLACE FUNCTION public.relatorio_autoclassificadas(_ciclo_id uuid DEFAULT NULL)
RETURNS TABLE (
  demanda_id       uuid,
  ticket_code      text,
  titulo           text,
  sistema_slug     text,
  responsavel_nome text,
  concluida_em     timestamptz,
  classificacao    text,
  rotulo           text,
  pontos           integer,
  justificativa    text,
  definido_por     text,
  definido_em      timestamptz,
  minutos_lancados integer,
  vezes_alterada   integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.tem_capacidade('remuneracao.ver_todas') THEN
    RAISE EXCEPTION 'Sem permissão para revisar classificações.'
      USING HINT = 'É preciso a capacidade remuneracao.ver_todas.';
  END IF;

  RETURN QUERY
  SELECT
    d.id, d.ticket_code, d.title, d.sistema_slug,
    p.nome,
    rcl.data_conclusao,
    cls.classificacao,
    tipo.rotulo,
    cls.pontos,
    cls.justificativa,
    cls.definido_por_email,
    cls.definido_em,
    coalesce(iv.minutos, 0)::integer,
    coalesce(h.n, 0)::integer
  FROM public.relatorio_classificacao cls
  JOIN public.demands d ON d.id = cls.demanda_id
  JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao_tipo tipo ON tipo.codigo = cls.classificacao
  LEFT JOIN public.profiles p ON p.id = d.assigned_to
  LEFT JOIN LATERAL (
    SELECT sum(EXTRACT(EPOCH FROM (i.fim - i.inicio)) / 60) AS minutos
      FROM public.relatorio_intervalo i WHERE i.demanda_id = d.id
  ) iv ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.relatorio_classificacao_historico hh
     WHERE hh.demanda_id = d.id AND hh.origem = 'alteracao'
  ) h ON true
  WHERE cls.autoclassificada
    AND d.deleted_at IS NULL
    AND (_ciclo_id IS NULL OR EXISTS (
      SELECT 1 FROM public.relatorio_ciclo c
       WHERE c.id = _ciclo_id
         AND rcl.data_conclusao >= c.inicio AND rcl.data_conclusao < c.fim
    ))
  ORDER BY cls.pontos DESC, cls.definido_em DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_autoclassificadas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_autoclassificadas(uuid)
  TO authenticated, service_role;
