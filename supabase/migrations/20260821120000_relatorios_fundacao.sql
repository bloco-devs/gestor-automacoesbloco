-- ===========================================================================
-- ETAPA 1 — FUNDAÇÃO DO MÓDULO DE RELATÓRIOS E REMUNERAÇÃO VARIÁVEL
-- ===========================================================================
--
-- Esta migration é INTEIRAMENTE ADITIVA. Ela não altera nenhuma tabela
-- existente, nenhuma policy existente e nenhum trigger existente.
--
-- Em particular, e de propósito:
--
--   * NÃO adiciona coluna em `demands`. Dois motivos concretos:
--     (a) todo UPDATE em `demands` dispara `trg_demanda_email` e
--         `trg_demand_notify` — um backfill de data mandaria aviso a cada
--         solicitante sobre demanda concluída meses atrás;
--     (b) `demands` está na publicação de realtime com REPLICA IDENTITY FULL,
--         e o filtro do realtime é por LINHA, não por coluna. Toda coluna
--         nova viaja para qualquer cliente inscrito que enxergue a linha.
--         É por isso que pontuação nunca pode morar ali.
--
--   * NÃO altera `allowed_emails.role`. Aquela coluna é única: marcar alguém
--     como "rh" APAGARIA o "requester" dela, e o pessoal do RH usa o Gestor
--     como solicitante. Capacidade entra por tabela separada, somando.
--
--   * NÃO estende o enum `app_role`. Postgres não remove valor de enum, e
--     `has_role` aparece 193 vezes em 52 migrations. Errar um nome de
--     capacidade ali seria permanente.
--
--   * NÃO publica nada em realtime. Relatório de remuneração não precisa de
--     atualização ao vivo, e publicar seria só superfície de vazamento.
--
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. CAPACIDADES — permissão que SOMA ao papel operacional
-- ---------------------------------------------------------------------------
--
-- O papel operacional continua em `allowed_emails.role` e não é tocado. Aqui
-- moram capacidades adicionais, e a chave única é (pessoa, capacidade) — o
-- que permite acumular quantas forem necessárias.
--
-- Isso resolve o caso do RH: ela permanece `requester`, abrindo e
-- acompanhando as próprias demandas como sempre, e ganha por cima o acesso
-- aos relatórios.

CREATE TABLE IF NOT EXISTS public.relatorio_capacidade (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capacidade          text NOT NULL,
  concedida_por       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- O e-mail fica gravado junto porque `concedida_por` é ON DELETE SET NULL:
  -- desativar um administrador não pode apagar o registro de quem concedeu
  -- acesso a dado financeiro. Mesmo raciocínio de `atividades_atividade_log`.
  concedida_por_email text,
  concedida_em        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relatorio_capacidade_unica UNIQUE (user_id, capacidade),

  -- Texto com CHECK em vez de enum, para que corrigir um nome errado seja
  -- UPDATE de constraint e não uma cicatriz permanente no catálogo.
  CONSTRAINT relatorio_capacidade_valida CHECK (capacidade IN (
    'relatorios.ver',
    'relatorios.gerar',
    'remuneracao.ver_propria',
    'remuneracao.ver_todas',
    'remuneracao.administrar',
    'classificacao.definir'
  ))
);

CREATE INDEX IF NOT EXISTS relatorio_capacidade_por_pessoa
  ON public.relatorio_capacidade (user_id, capacidade);

ALTER TABLE public.relatorio_capacidade ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.relatorio_capacidade TO authenticated;
GRANT ALL    ON public.relatorio_capacidade TO service_role;

-- Cada pessoa vê as capacidades dela; quem administra remuneração vê todas.
-- Sem policy de INSERT/UPDATE/DELETE para `authenticated`: conceder acesso a
-- dado financeiro passa por administrador no SQL ou por RPC futura, nunca por
-- escrita direta da interface.
DROP POLICY IF EXISTS relatorio_capacidade_select ON public.relatorio_capacidade;
CREATE POLICY relatorio_capacidade_select ON public.relatorio_capacidade
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'administrador');


-- ---------------------------------------------------------------------------
-- 2. AS DUAS FUNÇÕES DE ACESSO
-- ---------------------------------------------------------------------------

-- Segue o molde de `is_equipe()`: sql, STABLE, SECURITY DEFINER, search_path
-- fixo. Administrador herda todas as capacidades — é o comportamento que o
-- resto do sistema já tem, e não faria sentido um administrador precisar
-- conceder capacidade a si mesmo.
CREATE OR REPLACE FUNCTION public.tem_capacidade(_capacidade text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.get_my_role() = 'administrador'
      OR EXISTS (
           SELECT 1 FROM public.relatorio_capacidade
            WHERE user_id = auth.uid()
              AND capacidade = _capacidade
         );
$$;

-- ATENÇÃO AO QUE ESTA FUNÇÃO NÃO FAZ.
--
-- Ela não chama `is_equipe()`. E isso é o ponto inteiro dela.
--
-- `is_equipe()` devolve verdadeiro para QUALQUER developer. Usá-la para
-- proteger valor de remuneração faria cada desenvolvedor da equipe ver os
-- pontos e o valor em reais dos colegas — que é exatamente o vazamento que
-- este módulo não pode ter.
--
-- Ver a própria apuração exige capacidade explícita; ver a de outros exige
-- `remuneracao.ver_todas`.
CREATE OR REPLACE FUNCTION public.pode_ver_remuneracao_de(_pessoa uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (auth.uid() = _pessoa AND public.tem_capacidade('remuneracao.ver_propria'))
      OR public.tem_capacidade('remuneracao.ver_todas');
$$;

REVOKE ALL ON FUNCTION public.tem_capacidade(text)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_ver_remuneracao_de(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tem_capacidade(text)          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_ver_remuneracao_de(uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 3. CLASSIFICAÇÃO — a escala, configurável
-- ---------------------------------------------------------------------------
--
-- Fácil = 50, Médio = 100, Difícil = 200 entram como DADO, não como constante
-- espalhada pelo código. Mudar a escala passa a ser UPDATE de linha.
--
-- A tabela é a própria lista de classificações válidas (o `codigo` é a PK), o
-- que permite acrescentar ou desativar categoria no futuro sem ALTER TYPE.
-- Não reutilizei o enum `demand_complexity` de propósito: aquele é a
-- complexidade ESTIMADA na triagem, feita antes do trabalho. Esta é a
-- classificação da EXECUÇÃO, decidida depois. São julgamentos diferentes e
-- misturá-los faria editar a remuneração mexer na triagem da demanda.

CREATE TABLE IF NOT EXISTS public.relatorio_classificacao_tipo (
  codigo      text PRIMARY KEY,
  rotulo      text NOT NULL,
  pontos      integer NOT NULL,
  ordem       smallint NOT NULL,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relatorio_classificacao_pontos_positivos CHECK (pontos > 0),
  CONSTRAINT relatorio_classificacao_ordem_unica UNIQUE (ordem)
);

ALTER TABLE public.relatorio_classificacao_tipo ENABLE ROW LEVEL SECURITY;
-- INSERT e UPDATE sim; DELETE não. Categoria sai de uso pelo campo `ativo`,
-- nunca por exclusão — apagar a linha quebraria o histórico de quem já foi
-- classificado com ela. Sem GRANT DELETE, isso não é uma convenção que
-- alguém possa esquecer.
GRANT SELECT, INSERT, UPDATE ON public.relatorio_classificacao_tipo TO authenticated;
GRANT ALL ON public.relatorio_classificacao_tipo TO service_role;

-- A escala é pública para quem vê relatório: o desenvolvedor tem direito de
-- saber que Difícil vale 200. Não há segredo aqui — o segredo é quanto CADA
-- PESSOA fez, não quanto vale cada degrau.
DROP POLICY IF EXISTS relatorio_classificacao_tipo_select ON public.relatorio_classificacao_tipo;
CREATE POLICY relatorio_classificacao_tipo_select ON public.relatorio_classificacao_tipo
  FOR SELECT TO authenticated
  USING (public.tem_capacidade('relatorios.ver') OR public.is_equipe());

DROP POLICY IF EXISTS relatorio_classificacao_tipo_manage ON public.relatorio_classificacao_tipo;
CREATE POLICY relatorio_classificacao_tipo_manage ON public.relatorio_classificacao_tipo
  FOR ALL TO authenticated
  USING (public.tem_capacidade('remuneracao.administrar'))
  WITH CHECK (public.tem_capacidade('remuneracao.administrar'));

INSERT INTO public.relatorio_classificacao_tipo (codigo, rotulo, pontos, ordem) VALUES
  ('facil',   'Fácil',   50, 1),
  ('media',   'Médio',  100, 2),
  ('dificil', 'Difícil', 200, 3)
ON CONFLICT (codigo) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 4. FAIXAS DE ALCANCE — com a lacuna registrada como lacuna
-- ---------------------------------------------------------------------------
--
-- `valor_reais` é NULL-ável, e isso não é descuido: é como a faixa de
-- 100,01% a 119,99% existe no sistema sem ter valor.
--
-- A alternativa seria não cadastrar linha nenhuma para aquele intervalo — mas
-- aí "não achei faixa" ficaria indistinguível de "faixa existe e não tem
-- valor definido". Registrando a linha com valor nulo, o sistema sabe a
-- diferença e pode dizer "Faixa de remuneração não definida" com certeza.

CREATE TABLE IF NOT EXISTS public.relatorio_faixa (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotulo          text,
  percentual_min  numeric(7,2) NOT NULL,
  -- NULL = sem teto superior (a última faixa)
  percentual_max  numeric(7,2),
  -- NULL = faixa conhecida, valor ainda não definido pelo RH
  valor_reais     numeric(12,2),
  ativo           boolean NOT NULL DEFAULT true,
  vigencia_inicio date NOT NULL,
  vigencia_fim    date,
  definido_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relatorio_faixa_min_valido CHECK (percentual_min >= 0),
  CONSTRAINT relatorio_faixa_intervalo_coerente
    CHECK (percentual_max IS NULL OR percentual_max >= percentual_min),
  CONSTRAINT relatorio_faixa_valor_nao_negativo
    CHECK (valor_reais IS NULL OR valor_reais >= 0),
  CONSTRAINT relatorio_faixa_vigencia_coerente
    CHECK (vigencia_fim IS NULL OR vigencia_fim > vigencia_inicio)
);

CREATE INDEX IF NOT EXISTS relatorio_faixa_vigente
  ON public.relatorio_faixa (percentual_min)
  WHERE ativo AND vigencia_fim IS NULL;

ALTER TABLE public.relatorio_faixa ENABLE ROW LEVEL SECURITY;
-- Mesma regra da tabela de pontos: faixa se encerra por `vigencia_fim` ou
-- `ativo`, não por DELETE. Um ciclo já apurado precisa continuar achando a
-- faixa que valia na época.
GRANT SELECT, INSERT, UPDATE ON public.relatorio_faixa TO authenticated;
GRANT ALL ON public.relatorio_faixa TO service_role;

-- A tabela de faixas é mais sensível que a de pontos: junto com a meta, ela
-- permite calcular a remuneração de qualquer colega a partir dos pontos dele.
-- Por isso a leitura exige capacidade de remuneração, não só de relatório.
DROP POLICY IF EXISTS relatorio_faixa_select ON public.relatorio_faixa;
CREATE POLICY relatorio_faixa_select ON public.relatorio_faixa
  FOR SELECT TO authenticated
  USING (public.tem_capacidade('remuneracao.ver_propria')
      OR public.tem_capacidade('remuneracao.ver_todas'));

DROP POLICY IF EXISTS relatorio_faixa_manage ON public.relatorio_faixa;
CREATE POLICY relatorio_faixa_manage ON public.relatorio_faixa
  FOR ALL TO authenticated
  USING (public.tem_capacidade('remuneracao.administrar'))
  WITH CHECK (public.tem_capacidade('remuneracao.administrar'));

-- As faixas informadas pelo RH, mais a lacuna explícita.
--
-- POR QUE OS LIMITES SE ENCOSTAM EM VEZ DE PARAREM EM ,99
--
-- O RH escreveu "80% a 99%" e "a partir de 120%". Transcrever isso literal
-- como 80,00–99,99 e 100,01–119,99 abre buracos invisíveis: um alcance de
-- 99,995% não cairia em faixa nenhuma, e 119,995% também não. Com meta de
-- 800 e pontos múltiplos de 50 esses valores não acontecem hoje — mas
-- passam a acontecer se a meta mudar, e o sintoma seria "faixa não
-- definida" numa faixa que está perfeitamente definida.
--
-- Então o topo de cada faixa ENCOSTA na base da seguinte, e o desempate é
-- o `ORDER BY percentual_min DESC` da função de busca: no valor exato de
-- fronteira, ganha sempre a faixa de cima. Em 80,00 vale R$ 800; em 100,00
-- vale R$ 1.000; em 120,00 vale R$ 1.200.
--
-- O único vão que sobra é entre 100,00 e 100,01 — e esse é do próprio
-- desenho do RH, que definiu "exatamente 100%" como um ponto. Ali a busca
-- não devolve linha, e quem chama precisa tratar "nenhuma faixa" com a
-- MESMA mensagem de "faixa sem valor": "Faixa de remuneração não definida".
INSERT INTO public.relatorio_faixa
  (rotulo, percentual_min, percentual_max, valor_reais, vigencia_inicio)
SELECT * FROM (VALUES
  ('Abaixo da meta',      0.00,     80.00,  0.00::numeric,    DATE '2026-08-20'),
  ('Meta parcial',       80.00,    100.00,  800.00::numeric,  DATE '2026-08-20'),
  ('Meta atingida',     100.00,    100.00,  1000.00::numeric, DATE '2026-08-20'),
  -- A LACUNA. Valor nulo de propósito: o RH ainda não definiu.
  ('Não definida',      100.01,    120.00,  NULL::numeric,    DATE '2026-08-20'),
  ('Superação',         120.00,    NULL,    1200.00::numeric, DATE '2026-08-20')
) AS f(rotulo, percentual_min, percentual_max, valor_reais, vigencia_inicio)
WHERE NOT EXISTS (SELECT 1 FROM public.relatorio_faixa);

-- Resolve o percentual para uma faixa. Devolve a linha inteira para que quem
-- chama possa distinguir "não achei faixa" de "achei e não tem valor".
-- SEM `SECURITY DEFINER`, de propósito. Com DEFINER, esta função contornaria
-- a RLS da tabela e devolveria os valores das faixas para qualquer pessoa
-- logada — junto com a meta, isso permite calcular a remuneração de um colega
-- a partir dos pontos dele. Sem DEFINER, a RLS se aplica: quem não tem
-- capacidade de remuneração recebe zero linhas.
CREATE OR REPLACE FUNCTION public.relatorio_faixa_para(_percentual numeric, _em date DEFAULT CURRENT_DATE)
RETURNS public.relatorio_faixa
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT f.* FROM public.relatorio_faixa f
   WHERE f.ativo
     AND f.vigencia_inicio <= _em
     AND (f.vigencia_fim IS NULL OR f.vigencia_fim > _em)
     AND _percentual >= f.percentual_min
     AND (f.percentual_max IS NULL OR _percentual <= f.percentual_max)
   ORDER BY f.percentual_min DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.relatorio_faixa_para(numeric, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_faixa_para(numeric, date) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 5. CICLOS DE APURAÇÃO — dia 20 ao dia 19, como DADO
-- ---------------------------------------------------------------------------
--
-- A janela é gravada em colunas editáveis, não calculada na consulta. Se o RH
-- mudar o corte, é UPDATE de linha — não migration, não deploy.
--
-- INTERVALO SEMIABERTO, E ISSO IMPORTA MUITO.
--
-- `fim` é o dia 20 do mês seguinte às 00:00 em America/Sao_Paulo, e a
-- comparação é `>= inicio AND < fim`. Assim o dia 19 entra INTEIRO.
--
-- Se isso fosse feito em UTC, uma demanda concluída às 21h30 do dia 19 em
-- Brasília seria 00h30 do dia 20 em UTC e cairia fora do ciclo. A pessoa
-- perderia os pontos por causa de fuso horário.

CREATE TABLE IF NOT EXISTS public.relatorio_ciclo (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotulo       text NOT NULL,
  referencia   date NOT NULL,
  inicio       timestamptz NOT NULL,
  fim          timestamptz NOT NULL,
  fuso         text NOT NULL DEFAULT 'America/Sao_Paulo',
  meta_pontos  integer NOT NULL,
  situacao     text NOT NULL DEFAULT 'aberto',

  fechado_por  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fechado_em   timestamptz,
  aprovado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_em  timestamptz,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relatorio_ciclo_referencia_unica UNIQUE (referencia),
  CONSTRAINT relatorio_ciclo_referencia_canonica
    CHECK (EXTRACT(DAY FROM referencia) = 1),
  CONSTRAINT relatorio_ciclo_janela_coerente CHECK (fim > inicio),
  CONSTRAINT relatorio_ciclo_meta_positiva CHECK (meta_pontos > 0),
  CONSTRAINT relatorio_ciclo_situacao_valida
    CHECK (situacao IN ('aberto', 'em_analise', 'fechado', 'aprovado')),
  CONSTRAINT relatorio_ciclo_fechado_tem_autor
    CHECK (situacao NOT IN ('fechado', 'aprovado')
           OR (fechado_por IS NOT NULL AND fechado_em IS NOT NULL)),
  CONSTRAINT relatorio_ciclo_aprovado_tem_autor
    CHECK (situacao <> 'aprovado'
           OR (aprovado_por IS NOT NULL AND aprovado_em IS NOT NULL)),

  -- Duas janelas que se cruzam significam uma entrega contável em dois
  -- ciclos, ou seja, paga duas vezes. gist sobre range é do core do
  -- Postgres, não precisa de btree_gist (que não está instalado aqui).
  CONSTRAINT relatorio_ciclo_sem_sobreposicao
    EXCLUDE USING gist (tstzrange(inicio, fim, '[)') WITH &&)
);

ALTER TABLE public.relatorio_ciclo ENABLE ROW LEVEL SECURITY;
-- Sem DELETE: ciclo é histórico. E o trigger de imutabilidade abaixo recusa
-- qualquer alteração depois de aprovado, inclusive por quem tem capacidade.
GRANT SELECT, INSERT, UPDATE ON public.relatorio_ciclo TO authenticated;
GRANT ALL ON public.relatorio_ciclo TO service_role;

-- Janela e situação são metadado operacional, não valor. Quem vê relatório
-- pode ver que existe o ciclo de setembro e qual é o período dele.
DROP POLICY IF EXISTS relatorio_ciclo_select ON public.relatorio_ciclo;
CREATE POLICY relatorio_ciclo_select ON public.relatorio_ciclo
  FOR SELECT TO authenticated
  USING (public.tem_capacidade('relatorios.ver')
      OR public.tem_capacidade('remuneracao.ver_propria')
      OR public.is_equipe());

DROP POLICY IF EXISTS relatorio_ciclo_manage ON public.relatorio_ciclo;
CREATE POLICY relatorio_ciclo_manage ON public.relatorio_ciclo
  FOR ALL TO authenticated
  USING (public.tem_capacidade('remuneracao.administrar'))
  WITH CHECK (public.tem_capacidade('remuneracao.administrar'));

-- Ciclo aprovado não se reescreve. A trava fica no banco, não só na tela,
-- porque a tela é a camada mais fácil de contornar.
CREATE OR REPLACE FUNCTION public.trg_relatorio_ciclo_aprovado_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.situacao = 'aprovado' THEN
    RAISE EXCEPTION
      'O ciclo % já foi aprovado e não pode ser alterado. Registre um ajuste.',
      OLD.rotulo;
  END IF;
  -- COALESCE, não `NEW` puro. Em trigger BEFORE DELETE o `NEW` é NULL, e
  -- devolver NULL num BEFORE trigger CANCELA a operação — silenciosamente.
  -- Com `RETURN NEW` aqui, nenhum ciclo poderia ser excluído nunca, aprovado
  -- ou não, e sem mensagem de erro para investigar.
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS relatorio_ciclo_aprovado_imutavel ON public.relatorio_ciclo;
CREATE TRIGGER relatorio_ciclo_aprovado_imutavel
  BEFORE UPDATE OR DELETE ON public.relatorio_ciclo
  FOR EACH ROW EXECUTE FUNCTION public.trg_relatorio_ciclo_aprovado_imutavel();

-- Calcula a janela 20→19 de um mês de referência, no fuso local.
--   referência 2026-09-01  →  [2026-08-20 00:00 BRT, 2026-09-20 00:00 BRT)
-- O dia 19 de setembro entra inteiro; 20 de setembro já é o ciclo seguinte.
CREATE OR REPLACE FUNCTION public.relatorio_ciclo_janela(
  _referencia date,
  _fuso       text DEFAULT 'America/Sao_Paulo'
)
RETURNS TABLE (inicio timestamptz, fim timestamptz)
-- STABLE e não IMMUTABLE: `AT TIME ZONE <texto>` depende das regras de fuso do
-- servidor, que podem mudar entre versões do tzdata.
LANGUAGE sql
STABLE
AS $$
  SELECT
    ((date_trunc('month', _referencia)::date - INTERVAL '1 month' + INTERVAL '19 days')::timestamp
       AT TIME ZONE _fuso),
    ((date_trunc('month', _referencia)::date + INTERVAL '19 days')::timestamp
       AT TIME ZONE _fuso);
$$;

-- Em Postgres, função nasce executável por PUBLIC. O projeto revoga
-- explicitamente porque o padrão é permissivo demais — inclusive para `anon`.
REVOKE ALL ON FUNCTION public.relatorio_ciclo_janela(date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_ciclo_janela(date, text) TO authenticated, service_role;

-- O primeiro ciclo: 20/08/2026 a 19/09/2026, meta de 800 pontos.
INSERT INTO public.relatorio_ciclo (rotulo, referencia, inicio, fim, meta_pontos)
SELECT 'Setembro/2026', DATE '2026-09-01', j.inicio, j.fim, 800
  FROM public.relatorio_ciclo_janela(DATE '2026-09-01') j
 WHERE NOT EXISTS (
   SELECT 1 FROM public.relatorio_ciclo WHERE referencia = DATE '2026-09-01'
 );


-- ---------------------------------------------------------------------------
-- 6. DATA DE CONCLUSÃO COM PROCEDÊNCIA
-- ---------------------------------------------------------------------------
--
-- Tabela de RESOLUÇÃO, não de registro: uma linha por demanda, derivada e
-- recalculável em lote sem tocar em `demands` — logo, sem disparar e-mail
-- para solicitante e sem inundar o realtime.
--
-- A procedência existe porque data sem origem é indistinguível de chute, e
-- este número decide se alguém recebe ou não.

CREATE TABLE IF NOT EXISTS public.relatorio_conclusao (
  demanda_id          uuid PRIMARY KEY REFERENCES public.demands(id) ON DELETE CASCADE,
  data_conclusao      timestamptz,
  procedencia         text NOT NULL,

  evidencia_tipo      text,
  -- Ponteiro polimórfico, sem FK de propósito: aponta para
  -- `demand_audit_logs.id` ou `demand_comments.id` conforme o tipo. Uma FK
  -- real exigiria quatro colunas nuláveis e quatro CHECKs de exclusividade
  -- para ganhar integridade sobre uma linha de auditoria que pode ser
  -- legitimamente purgada. A descrição legível abaixo sobrevive à purga.
  evidencia_ref       uuid,
  evidencia_descricao text,

  resolvido_em        timestamptz NOT NULL DEFAULT now(),
  resolvido_por       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo              text,

  CONSTRAINT relatorio_conclusao_procedencia_valida
    CHECK (procedencia IN ('confirmada', 'inferida', 'nao_identificada')),

  CONSTRAINT relatorio_conclusao_evidencia_valida
    CHECK (evidencia_tipo IS NULL OR evidencia_tipo IN (
      'demand_audit_log', 'fechamento_tecnico', 'demand_comment', 'manual')),

  -- O CORAÇÃO DA REGRA: "confirmada" só existe com transição de status
  -- registrada em auditoria. Nenhum humano consegue produzir "confirmada" —
  -- o melhor que uma decisão manual gera é "inferida". O banco recusa a
  -- alternativa, então isso não depende de ninguém lembrar.
  CONSTRAINT relatorio_conclusao_confirmada_exige_transicao
    CHECK (procedencia <> 'confirmada'
           OR (evidencia_tipo = 'demand_audit_log' AND evidencia_ref IS NOT NULL)),

  -- Sem data se e somente se não identificada. Nunca data sem procedência,
  -- nunca "não identificada" carregando data.
  CONSTRAINT relatorio_conclusao_data_casa_procedencia
    CHECK ((procedencia = 'nao_identificada') = (data_conclusao IS NULL)),

  -- Intervenção humana precisa de nome e motivo.
  CONSTRAINT relatorio_conclusao_manual_exige_motivo
    CHECK (evidencia_tipo IS DISTINCT FROM 'manual'
           OR (resolvido_por IS NOT NULL AND length(btrim(coalesce(motivo, ''))) > 0))
);

CREATE INDEX IF NOT EXISTS relatorio_conclusao_por_data
  ON public.relatorio_conclusao (data_conclusao)
  WHERE procedencia = 'confirmada';

CREATE INDEX IF NOT EXISTS relatorio_conclusao_por_procedencia
  ON public.relatorio_conclusao (procedencia);

ALTER TABLE public.relatorio_conclusao ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.relatorio_conclusao TO authenticated;
GRANT ALL    ON public.relatorio_conclusao TO service_role;

-- Sem policy de escrita para `authenticated`: quem escreve é a função
-- resolvedora (SECURITY DEFINER) e a RPC de decisão manual. Mesmo padrão de
-- `demand_audit_logs` e `notificacao_email_fila`.
DROP POLICY IF EXISTS relatorio_conclusao_select ON public.relatorio_conclusao;
CREATE POLICY relatorio_conclusao_select ON public.relatorio_conclusao
  FOR SELECT TO authenticated
  USING (public.tem_capacidade('relatorios.ver') OR public.is_equipe());

-- Sustenta a busca da última transição para concluído. `demand_audit_logs`
-- hoje só tem índice por (demand_id, created_at) — este é o recorte que o
-- resolvedor usa. Índice parcial, aditivo, sem alterar a tabela.
CREATE INDEX IF NOT EXISTS demand_audit_transicao_concluido
  ON public.demand_audit_logs (demand_id, created_at DESC)
  WHERE action = 'status_changed' AND new_value = 'concluido';

-- Resolve a data de conclusão de UMA demanda, em cascata de evidência,
-- parando na primeira que serve. Não inventa: se nada existe, devolve
-- "nao_identificada" e a demanda fica fora da apuração até alguém revisar.
--
-- Sobre reabertura: a busca é ORDER BY created_at DESC LIMIT 1, ou seja vale
-- a ÚLTIMA conclusão. Se a demanda foi reaberta, ela não estava pronta na
-- primeira vez.
CREATE OR REPLACE FUNCTION public.relatorio_resolver_conclusao(_demanda_id uuid)
RETURNS public.relatorio_conclusao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status  public.demand_status;
  v_log     public.demand_audit_logs%ROWTYPE;
  v_saida   public.relatorio_conclusao;
BEGIN
  SELECT status INTO v_status FROM public.demands WHERE id = _demanda_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda % não existe.', _demanda_id;
  END IF;

  -- Nível 1 — a transição registrada. É a única que produz "confirmada".
  SELECT * INTO v_log
    FROM public.demand_audit_logs
   WHERE demand_id = _demanda_id
     AND action = 'status_changed'
     AND new_value = 'concluido'
   ORDER BY created_at DESC
   LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.relatorio_conclusao AS rc
      (demanda_id, data_conclusao, procedencia,
       evidencia_tipo, evidencia_ref, evidencia_descricao)
    VALUES
      (_demanda_id, v_log.created_at, 'confirmada',
       'demand_audit_log', v_log.id,
       format('Transição %s → concluido registrada em %s',
              coalesce(v_log.old_value, 'sem status'),
              to_char(v_log.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')))
    ON CONFLICT (demanda_id) DO UPDATE SET
      data_conclusao      = EXCLUDED.data_conclusao,
      procedencia         = EXCLUDED.procedencia,
      evidencia_tipo      = EXCLUDED.evidencia_tipo,
      evidencia_ref       = EXCLUDED.evidencia_ref,
      evidencia_descricao = EXCLUDED.evidencia_descricao,
      resolvido_em        = now(),
      resolvido_por       = NULL,
      motivo              = NULL
    RETURNING rc.* INTO v_saida;
    RETURN v_saida;
  END IF;

  -- NÃO EXISTE NÍVEL 2 AUTOMÁTICO, E ISSO É DELIBERADO.
  --
  -- Cheguei a escrever um que lia `notificacao_email_fila`, e desisti por dois
  -- motivos: aquela tabela é do módulo de e-mail, que é pendência separada
  -- deste trabalho — acoplar os dois faria um depender do outro sem
  -- necessidade; e ela só tem dados desde 19/08/2026, então o ganho seria
  -- quase nulo.
  --
  -- Quem quiser marcar uma data sem transição registrada faz isso à mão, com
  -- nome e motivo, e o resultado é "inferida" — nunca "confirmada".

  -- Nível 2 — nada. E "nada" é uma resposta legítima.
  --
  -- Repare no que NÃO está aqui: `demands.updated_at`. Ele é reescrito por
  -- qualquer edição — reordenar um cartão muda a "data de conclusão" — e o
  -- painel atual do sistema usa justamente ele, que é a razão de o tempo
  -- médio de resolução estar enviesado hoje. Usá-lo aqui seria inventar
  -- data com aparência de precisão.
  INSERT INTO public.relatorio_conclusao AS rc
    (demanda_id, data_conclusao, procedencia, evidencia_descricao)
  VALUES
    (_demanda_id, NULL, 'nao_identificada',
     CASE WHEN v_status = 'concluido'
          THEN 'Demanda concluída sem transição registrada. Anterior a 21/07/2026 ou criada já concluída.'
          ELSE 'Demanda ainda não concluída.'
     END)
  ON CONFLICT (demanda_id) DO UPDATE SET
    data_conclusao      = NULL,
    procedencia         = 'nao_identificada',
    evidencia_tipo      = NULL,
    evidencia_ref       = NULL,
    evidencia_descricao = EXCLUDED.evidencia_descricao,
    resolvido_em        = now()
  RETURNING rc.* INTO v_saida;
  RETURN v_saida;
END $$;

-- NÃO CONCEDIDA A `authenticated`, E ISSO É PROPOSITAL.
--
-- A função é SECURITY DEFINER: ela contorna a RLS de `relatorio_conclusao`.
-- Se qualquer pessoa logada pudesse chamá-la com um id arbitrário, um
-- solicitante comum conseguiria enumerar a data de conclusão de todas as
-- demandas do sistema — e ainda escrever linhas na tabela.
--
-- Quem chama é o trigger (que roda como definer) e o service role. Uma
-- re-resolução manual, quando existir, será RPC própria com checagem de
-- capacidade.
REVOKE ALL ON FUNCTION public.relatorio_resolver_conclusao(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_resolver_conclusao(uuid) TO service_role;

-- Resolve em lote as concluídas que ainda não têm linha. NÃO faz UPDATE em
-- `demands` — só lê. Pode rodar quantas vezes quiser.
CREATE OR REPLACE FUNCTION public.relatorio_resolver_conclusoes_pendentes(_limite integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id    uuid;
  v_total integer := 0;
BEGIN
  FOR v_id IN
    SELECT d.id FROM public.demands d
     WHERE d.status = 'concluido'
       AND d.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.relatorio_conclusao rc WHERE rc.demanda_id = d.id
       )
     ORDER BY d.created_at
     LIMIT _limite
  LOOP
    PERFORM public.relatorio_resolver_conclusao(v_id);
    v_total := v_total + 1;
  END LOOP;
  RETURN v_total;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_resolver_conclusoes_pendentes(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_resolver_conclusoes_pendentes(integer) TO service_role;

-- Mantém a resolução em dia de agora em diante: quando uma demanda entra em
-- `concluido`, a linha nasce sozinha. AFTER UPDATE só, igual à auditoria de
-- onde a evidência vem — não faz sentido resolver antes de existir transição.
CREATE OR REPLACE FUNCTION public.trg_relatorio_conclusao_sincroniza()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Best-effort: falha aqui nunca pode derrubar a movimentação do cartão.
    BEGIN
      PERFORM public.relatorio_resolver_conclusao(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'relatorio_conclusao: falha ao resolver % — %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;

-- O NOME COMEÇA COM "zz" DE PROPÓSITO, E ISSO NÃO É ESTILO.
--
-- Triggers de mesmo momento disparam em ORDEM ALFABÉTICA do nome. Este
-- trigger LÊ `demand_audit_logs`, que é escrito por `trg_audit_demand_changes`
-- — também AFTER UPDATE. Com um nome que ordenasse antes, este rodaria
-- primeiro, não acharia a linha de auditoria recém-criada e gravaria
-- "nao_identificada" em TODA conclusão.
--
-- "trg_zz..." ordena depois de "trg_audit...", então a evidência já existe
-- quando o resolvedor procura por ela.
DROP TRIGGER IF EXISTS relatorio_conclusao_sincroniza ON public.demands;
DROP TRIGGER IF EXISTS trg_zz_relatorio_conclusao ON public.demands;
CREATE TRIGGER trg_zz_relatorio_conclusao
  AFTER UPDATE ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.trg_relatorio_conclusao_sincroniza();


-- ---------------------------------------------------------------------------
-- 7. A QUE CICLO UMA DATA PERTENCE
-- ---------------------------------------------------------------------------
--
-- Semiaberto: >= inicio E < fim. Escrito uma vez, aqui, para que nenhuma
-- consulta do módulo precise repetir a comparação e errar o sinal.
CREATE OR REPLACE FUNCTION public.relatorio_ciclo_de(_momento timestamptz)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT c.id FROM public.relatorio_ciclo c
   WHERE _momento >= c.inicio AND _momento < c.fim
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.relatorio_ciclo_de(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_ciclo_de(timestamptz) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 8. MANUTENÇÃO DE `updated_at`
-- ---------------------------------------------------------------------------
-- Reutiliza a função que o projeto já tem, em vez de escrever outra igual.

DROP TRIGGER IF EXISTS relatorio_classificacao_tipo_updated_at ON public.relatorio_classificacao_tipo;
CREATE TRIGGER relatorio_classificacao_tipo_updated_at
  BEFORE UPDATE ON public.relatorio_classificacao_tipo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS relatorio_faixa_updated_at ON public.relatorio_faixa;
CREATE TRIGGER relatorio_faixa_updated_at
  BEFORE UPDATE ON public.relatorio_faixa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS relatorio_ciclo_updated_at ON public.relatorio_ciclo;
CREATE TRIGGER relatorio_ciclo_updated_at
  BEFORE UPDATE ON public.relatorio_ciclo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------------
-- 9. FUNÇÕES DE TRIGGER NÃO SÃO PARA CHAMAR À MÃO
-- ---------------------------------------------------------------------------
-- Ambas são SECURITY DEFINER. Deixá-las executáveis por `authenticated` daria
-- um caminho para rodar código privilegiado fora do contexto do trigger.
REVOKE ALL ON FUNCTION public.trg_relatorio_ciclo_aprovado_imutavel()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_relatorio_conclusao_sincroniza()
  FROM PUBLIC, anon, authenticated;
