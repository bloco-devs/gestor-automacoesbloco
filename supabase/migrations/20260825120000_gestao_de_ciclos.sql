-- ===========================================================================
-- FASE 2 — GESTÃO DE CICLOS PELA INTERFACE
-- ===========================================================================
--
-- O QUE FALTAVA, E O QUE NÃO FALTAVA
--
-- O motor de apuração nunca soube o que é "dia 20". Todas as funções —
-- `relatorio_ciclo_de`, `relatorio_apuracao_do_ciclo`,
-- `relatorio_resultado_do_ciclo`, `relatorio_fechar_ciclo`,
-- `relatorio_implementacoes` — leem `inicio` e `fim` da tabela. Um ciclo
-- 01/09 → 30/09 já funciona hoje, sem uma linha de código nova.
--
-- O que não existia era a PORTA: o único ciclo cadastrado existe porque uma
-- migration o semeou. Não havia como o RH criar o próximo. Era isso que fazia
-- 20 → 19 parecer regra do sistema — não o código, a ausência de alternativa.
--
-- Esta migration cria três funções de administração. Nenhuma tabela nova,
-- nenhuma coluna nova, nenhuma regra de negócio nova.
--
-- ---------------------------------------------------------------------------
-- AVISO SOBRE A POLICY EXISTENTE — leia antes de confiar nestas funções
-- ---------------------------------------------------------------------------
--
-- Já existe, desde a fundação:
--
--   CREATE POLICY relatorio_ciclo_manage ON public.relatorio_ciclo
--     FOR ALL TO authenticated
--     USING (public.tem_capacidade('remuneracao.administrar'));
--
-- `FOR ALL`, mais `GRANT SELECT, INSERT, UPDATE`. Ou seja: quem tem
-- `remuneracao.administrar` JÁ PODE inserir e editar ciclo direto da
-- interface, sem passar por função nenhuma.
--
-- Estas RPCs NÃO são, portanto, o único caminho de escrita. Elas são o
-- caminho BOM — validam antes, explicam o erro em português e deixam uma
-- única definição do que é ciclo válido. Mas a porta lateral continua aberta.
--
-- Não a fecho aqui de propósito: restringir aquela policy é alteração de RLS
-- existente, e a instrução foi não mexer em RLS sem necessidade. A FASE 2
-- funciona com ela aberta. Fica registrado como decisão separada — e este
-- comentário existe para que ninguém leia "criamos RPCs" e conclua que a
-- gravação direta foi bloqueada. Já cometi esse erro nas migrations de GRANT
-- deste mesmo módulo; a errata está em 20260824140000.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. CRIAR CICLO
-- ---------------------------------------------------------------------------
/**
 * `referencia` é a FOLHA de destino, não o período de produção.
 *
 * A distinção é a correção conceitual central deste módulo: a folha de
 * setembro paga trabalho feito entre 20/08 e 19/09. Uma coisa é quando o
 * dinheiro sai; outra é qual trabalho ele remunera. O schema já separava as
 * duas — `referencia date` de um lado, `inicio`/`fim` do outro — e é essa
 * separação que permite ao RH mudar a janela sem mudar código.
 *
 * A CHECK do banco exige `referencia` no dia 1. Em vez de devolver erro quando
 * alguém escolher 15/09, canonizo para 01/09: a pessoa está informando um MÊS,
 * e o dia dentro dele não carrega significado. Recusar seria pedir que ela
 * adivinhe uma convenção interna.
 */
CREATE OR REPLACE FUNCTION public.relatorio_criar_ciclo(
  _rotulo     text,
  _referencia date,
  _inicio     timestamptz,
  _fim        timestamptz,
  _meta       integer
)
RETURNS public.relatorio_ciclo
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ref    date;
  v_saida  public.relatorio_ciclo;
  v_choque public.relatorio_ciclo;
BEGIN
  IF NOT public.tem_capacidade('remuneracao.administrar') THEN
    RAISE EXCEPTION 'Sem permissão para criar ciclo.'
      USING HINT = 'É preciso a capacidade remuneracao.administrar.';
  END IF;

  IF length(btrim(coalesce(_rotulo, ''))) < 3 THEN
    RAISE EXCEPTION 'Informe um nome para o ciclo.'
      USING HINT = 'Por exemplo: Setembro/2026.';
  END IF;
  IF _referencia IS NULL THEN
    RAISE EXCEPTION 'Informe a referência da folha.';
  END IF;
  IF _inicio IS NULL OR _fim IS NULL THEN
    RAISE EXCEPTION 'Informe o início e o fim do período de produção.';
  END IF;
  IF _fim <= _inicio THEN
    RAISE EXCEPTION 'O fim do período precisa ser depois do início.';
  END IF;
  IF coalesce(_meta, 0) <= 0 THEN
    RAISE EXCEPTION 'A meta precisa ser maior que zero.';
  END IF;

  v_ref := date_trunc('month', _referencia)::date;

  -- Checagem ANTES de inserir, só para poder dizer QUAL ciclo conflita. O
  -- EXCLUDE do banco barraria de qualquer jeito, mas com uma mensagem que
  -- cita o nome da constraint e não ajuda ninguém a resolver.
  SELECT * INTO v_choque FROM public.relatorio_ciclo c
   WHERE tstzrange(c.inicio, c.fim, '[)') && tstzrange(_inicio, _fim, '[)')
   LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'O período informado se sobrepõe ao ciclo %, que vai de % a %.',
      v_choque.rotulo,
      to_char(v_choque.inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'),
      to_char((v_choque.fim - INTERVAL '1 second') AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY')
      USING HINT = 'Dois ciclos que se cruzam fariam a mesma entrega ser apurada duas vezes.';
  END IF;

  SELECT * INTO v_choque FROM public.relatorio_ciclo c WHERE c.referencia = v_ref;
  IF FOUND THEN
    RAISE EXCEPTION 'Já existe um ciclo para a folha de %: %.',
      to_char(v_ref, 'MM/YYYY'), v_choque.rotulo
      USING HINT = 'Edite o ciclo existente ou escolha outra referência de folha.';
  END IF;

  INSERT INTO public.relatorio_ciclo (rotulo, referencia, inicio, fim, meta_pontos)
  VALUES (btrim(_rotulo), v_ref, _inicio, _fim, _meta)
  RETURNING * INTO v_saida;

  RETURN v_saida;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_criar_ciclo(text, date, timestamptz, timestamptz, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_criar_ciclo(text, date, timestamptz, timestamptz, integer)
  TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. EDITAR CICLO
-- ---------------------------------------------------------------------------
/**
 * Ciclo fechado ou aprovado não se edita.
 *
 * Não é rigor por rigor: o snapshot em `relatorio_ciclo_item` foi tirado com
 * base naquela janela. Mudar `inicio`/`fim` depois do fechamento deixaria o
 * congelado descrevendo um período que não existe mais — e o snapshot é
 * justamente o que dá ao RH a garantia de que o número não muda sozinho.
 *
 * O caminho para alterar continua sendo `relatorio_reabrir_ciclo`, que exige
 * motivo e apaga o snapshot antes de liberar.
 */
CREATE OR REPLACE FUNCTION public.relatorio_editar_ciclo(
  _ciclo_id   uuid,
  _rotulo     text,
  _referencia date,
  _inicio     timestamptz,
  _fim        timestamptz,
  _meta       integer
)
RETURNS public.relatorio_ciclo
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ref    date;
  v_atual  public.relatorio_ciclo;
  v_saida  public.relatorio_ciclo;
  v_choque public.relatorio_ciclo;
BEGIN
  IF NOT public.tem_capacidade('remuneracao.administrar') THEN
    RAISE EXCEPTION 'Sem permissão para editar ciclo.'
      USING HINT = 'É preciso a capacidade remuneracao.administrar.';
  END IF;

  SELECT * INTO v_atual FROM public.relatorio_ciclo WHERE id = _ciclo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo não encontrado.';
  END IF;

  IF v_atual.situacao IN ('fechado', 'aprovado') THEN
    RAISE EXCEPTION 'O ciclo % está % e não pode ser editado.',
      v_atual.rotulo, v_atual.situacao
      USING HINT = 'Reabra o ciclo, informando o motivo, para poder alterá-lo.';
  END IF;

  IF length(btrim(coalesce(_rotulo, ''))) < 3 THEN
    RAISE EXCEPTION 'Informe um nome para o ciclo.';
  END IF;
  IF _inicio IS NULL OR _fim IS NULL THEN
    RAISE EXCEPTION 'Informe o início e o fim do período de produção.';
  END IF;
  IF _fim <= _inicio THEN
    RAISE EXCEPTION 'O fim do período precisa ser depois do início.';
  END IF;
  IF coalesce(_meta, 0) <= 0 THEN
    RAISE EXCEPTION 'A meta precisa ser maior que zero.';
  END IF;

  v_ref := date_trunc('month', _referencia)::date;

  -- O próprio ciclo fica de fora das duas checagens: ele sempre "conflita"
  -- consigo mesmo.
  SELECT * INTO v_choque FROM public.relatorio_ciclo c
   WHERE c.id <> _ciclo_id
     AND tstzrange(c.inicio, c.fim, '[)') && tstzrange(_inicio, _fim, '[)')
   LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'O período informado se sobrepõe ao ciclo %, que vai de % a %.',
      v_choque.rotulo,
      to_char(v_choque.inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'),
      to_char((v_choque.fim - INTERVAL '1 second') AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');
  END IF;

  SELECT * INTO v_choque FROM public.relatorio_ciclo c
   WHERE c.id <> _ciclo_id AND c.referencia = v_ref;
  IF FOUND THEN
    RAISE EXCEPTION 'Já existe um ciclo para a folha de %: %.',
      to_char(v_ref, 'MM/YYYY'), v_choque.rotulo;
  END IF;

  UPDATE public.relatorio_ciclo
     SET rotulo      = btrim(_rotulo),
         referencia  = v_ref,
         inicio      = _inicio,
         fim         = _fim,
         meta_pontos = _meta,
         updated_at  = now()
   WHERE id = _ciclo_id
  RETURNING * INTO v_saida;

  RETURN v_saida;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_editar_ciclo(uuid, text, date, timestamptz, timestamptz, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_editar_ciclo(uuid, text, date, timestamptz, timestamptz, integer)
  TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. LISTAR CICLOS PARA ADMINISTRAÇÃO
-- ---------------------------------------------------------------------------
/**
 * Uma linha por ciclo, com o estado e os números de cada um.
 *
 * CICLO FECHADO LÊ O SNAPSHOT, CICLO ABERTO CALCULA AO VIVO. É a mesma regra
 * de `relatorio_resultado_do_ciclo`, e existe para que esta tela não vire uma
 * segunda versão da verdade: se aqui recalculasse sempre, um ciclo fechado
 * apareceria com número diferente do PDF que o RH já entregou.
 *
 * As contagens de elegibilidade são uma PARTIÇÃO — cada demanda cai em
 * exatamente uma das quatro, em ordem de prioridade:
 *
 *   sem_data_confiavel  → procedência não confirmada
 *   sem_fechamento      → data ok, relato técnico não registrado
 *   sem_classificacao   → data ok, relato ok, ninguém classificou
 *   elegiveis           → os três em ordem
 *
 *   concluidas = a soma das quatro. Sempre.
 *
 * `com_fechamento` e `classificadas` vêm juntos, mas são CUMULATIVAS e não
 * fazem parte da partição — servem para a tela dizer "40 de 47 já têm relato"
 * sem somar com as outras. A RPC `relatorio_pendencias_do_ciclo` ainda usa
 * contagens que se sobrepõem; será alinhada com esta definição na FASE 4.
 */
CREATE OR REPLACE FUNCTION public.relatorio_ciclos_administraveis()
RETURNS TABLE (
  id                 uuid,
  rotulo             text,
  referencia         date,
  inicio             timestamptz,
  fim                timestamptz,
  meta_pontos        integer,
  situacao           text,
  editavel           boolean,
  congelado          boolean,
  fechado_em         timestamptz,
  fechado_por_email  text,
  aprovado_em        timestamptz,
  observacoes        text,
  concluidas         integer,
  com_fechamento     integer,
  classificadas      integer,
  elegiveis          integer,
  sem_fechamento     integer,
  sem_classificacao  integer,
  sem_data_confiavel integer,
  pontos             integer,
  percentual         numeric,
  faixa_rotulo       text,
  valor_reais        numeric,
  faixa_indefinida   boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c     public.relatorio_ciclo;
  v_faixa public.relatorio_faixa;
  v_snap  public.relatorio_ciclo_resultado;
BEGIN
  -- Devolve valor em reais, então não basta `relatorios.ver`. Administrar
  -- também entra porque quem administra precisa ver o que vai fechar.
  IF NOT (public.tem_capacidade('remuneracao.administrar')
          OR public.tem_capacidade('remuneracao.ver_todas')) THEN
    RAISE EXCEPTION 'Sem permissão para ver a gestão de ciclos.'
      USING HINT = 'É preciso remuneracao.ver_todas ou remuneracao.administrar.';
  END IF;

  FOR v_c IN SELECT * FROM public.relatorio_ciclo ORDER BY inicio DESC LOOP
    id          := v_c.id;
    rotulo      := v_c.rotulo;
    referencia  := v_c.referencia;
    inicio      := v_c.inicio;
    fim         := v_c.fim;
    meta_pontos := v_c.meta_pontos;
    situacao    := v_c.situacao;
    editavel    := (v_c.situacao NOT IN ('fechado', 'aprovado'));
    congelado   := (v_c.situacao IN ('fechado', 'aprovado'));
    fechado_em  := v_c.fechado_em;
    aprovado_em := v_c.aprovado_em;
    observacoes := v_c.observacoes;

    SELECT u.email INTO fechado_por_email
      FROM auth.users u WHERE u.id = v_c.fechado_por;

    -- A partição. Semiaberto `>= inicio AND < fim`, como em todo o módulo.
    SELECT
      count(*)::integer,
      count(*) FILTER (WHERE coalesce(f.situacao, 'x') = 'concluido')::integer,
      count(*) FILTER (WHERE cls.demanda_id IS NOT NULL)::integer,
      count(*) FILTER (
        WHERE rcl.procedencia = 'confirmada'
          AND coalesce(f.situacao, 'x') = 'concluido'
          AND cls.demanda_id IS NOT NULL)::integer,
      count(*) FILTER (
        WHERE rcl.procedencia = 'confirmada'
          AND coalesce(f.situacao, 'x') <> 'concluido')::integer,
      count(*) FILTER (
        WHERE rcl.procedencia = 'confirmada'
          AND coalesce(f.situacao, 'x') = 'concluido'
          AND cls.demanda_id IS NULL)::integer,
      count(*) FILTER (WHERE rcl.procedencia <> 'confirmada')::integer
    INTO concluidas, com_fechamento, classificadas,
         elegiveis, sem_fechamento, sem_classificacao, sem_data_confiavel
    FROM public.demands d
    JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
    LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
    LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
    WHERE d.deleted_at IS NULL
      AND d.status = 'concluido'
      AND rcl.data_conclusao IS NOT NULL
      AND rcl.data_conclusao >= v_c.inicio
      AND rcl.data_conclusao <  v_c.fim;

    IF congelado THEN
      SELECT * INTO v_snap FROM public.relatorio_ciclo_resultado r
       WHERE r.ciclo_id = v_c.id AND r.pessoa_id IS NULL;

      pontos           := coalesce(v_snap.pontos, 0);
      percentual       := v_snap.percentual;
      faixa_rotulo     := v_snap.faixa_rotulo;
      valor_reais      := v_snap.valor_reais;
      faixa_indefinida := coalesce(v_snap.faixa_indefinida, false);
    ELSE
      -- Ao vivo: só o que é elegível soma ponto. Mesmos três JOINs de
      -- `relatorio_resultado_do_ciclo`, para os dois números baterem.
      SELECT coalesce(sum(cls.pontos), 0)::integer INTO pontos
        FROM public.demands d
        JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
        JOIN public.relatorio_fechamento_tecnico f
             ON f.demanda_id = d.id AND f.situacao = 'concluido'
        JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
       WHERE d.deleted_at IS NULL
         AND d.status = 'concluido'
         AND rcl.procedencia = 'confirmada'
         AND rcl.data_conclusao >= v_c.inicio
         AND rcl.data_conclusao <  v_c.fim;

      percentual := CASE WHEN v_c.meta_pontos > 0
                         THEN round(100.0 * pontos / v_c.meta_pontos, 4)
                         ELSE 0 END;

      SELECT * INTO v_faixa FROM public.relatorio_faixa_para(percentual, v_c.inicio::date);

      -- Faixa ausente e faixa sem valor são a MESMA coisa para a tela: não há
      -- número em reais a mostrar. A lacuna de 100,01% a 119,99% cai aqui.
      faixa_indefinida := (v_faixa.id IS NULL) OR (v_faixa.valor_reais IS NULL);
      faixa_rotulo     := v_faixa.rotulo;
      valor_reais      := CASE WHEN faixa_indefinida THEN NULL ELSE v_faixa.valor_reais END;
    END IF;

    RETURN NEXT;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_ciclos_administraveis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_ciclos_administraveis() TO authenticated;

COMMENT ON FUNCTION public.relatorio_ciclos_administraveis() IS
  'Ciclos com estado, elegibilidade particionada e resultado. Fechado lê snapshot; aberto calcula ao vivo.';


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- Lê a tabela direto, sem chamar as funções acima: no SQL Editor não há JWT,
-- `get_my_role()` devolve 'requester' por COALESCE, e qualquer função com
-- checagem de capacidade levantaria 'Sem permissão' — derrubando a migration
-- inteira no rollback da transação. Foi o que aconteceu em 20260824160000.

SELECT
  c.rotulo,
  to_char(c.referencia, 'MM/YYYY')                                      AS folha,
  to_char(c.inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS producao_de,
  to_char((c.fim - INTERVAL '1 second') AT TIME ZONE 'America/Sao_Paulo',
          'DD/MM/YYYY HH24:MI:SS')                                      AS producao_ate,
  c.meta_pontos,
  c.situacao
FROM public.relatorio_ciclo c
ORDER BY c.inicio DESC;
