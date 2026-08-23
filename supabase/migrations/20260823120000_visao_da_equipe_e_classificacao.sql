-- ===========================================================================
-- VISÃO DA EQUIPE EM `demands` + CLASSIFICAÇÃO NO RELATÓRIO
-- ===========================================================================
--
-- Duas coisas, e a primeira é a menor alteração de permissão que resolve o
-- problema relatado.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A EQUIPE PASSA A LER O QUE JÁ PODE ALTERAR
-- ---------------------------------------------------------------------------
--
-- SINTOMA
-- Nenhum erro, nenhuma tela vazia: os números do `/admin/analytics` vinham
-- menores. Cada developer via total, tendência e SLA calculados apenas sobre
-- as demandas que ele mesmo abriu ou assumiu. Dois developers na mesma tela,
-- no mesmo instante, liam números diferentes — e nenhum tinha como saber que o
-- seu estava incompleto. O mesmo vale para o quadro de `/admin/demandas`.
--
-- CAUSA
-- Essas telas leem `demands` por consulta de cliente (`listDemands`), sujeita
-- a RLS. Quem decide o que elas veem é a policy de SELECT, não o guarda de
-- rota. E a policy só autoriza dono, responsável ou `has_role(admin)`.
--
-- Em 20260728120000 essa assimetria foi corrigida — mas SÓ no UPDATE, que
-- passou a aceitar `is_equipe()`. O SELECT ficou atrás. Sobrou uma situação
-- difícil de adivinhar: a equipe pode ALTERAR qualquer demanda e continua sem
-- poder LER todas. Esconder no SELECT uma linha que a mesma pessoa pode
-- atualizar não protege nada — só falseia relatório.
--
-- Evidência de que a intenção já era essa: `can_view_demand()`
-- (20260817121617), usada para anexos e storage, JÁ inclui `is_equipe()`. Hoje
-- o time vê os anexos de uma demanda que a tabela esconde dele.
--
-- POR QUE `is_equipe()` E NÃO BACKFILL DE `user_roles`
-- A outra saída considerada era preencher `user_roles.admin` para todo
-- developer, fazendo `has_role(admin)` passar. Foi descartada de propósito:
-- `has_role(auth.uid(),'admin')` aparece em ~165 políticas deste schema, então
-- o backfill daria privilégio de administrador em TODO o sistema para
-- consertar uma tela. Blast radius desproporcional.
--
-- `is_equipe()` afeta exatamente uma leitura, e lê `allowed_emails.role` —
-- a fonte da verdade do papel — em vez de `user_roles`, que é tabela derivada
-- mantida por gatilho. Assim a visão não depende de um gatilho ter rodado no
-- passado para quem foi cadastrado antes.
--
-- O QUE NÃO MUDA
--   * O solicitante continua vendo apenas as demandas que abriu.
--   * `builder` NÃO entra: `is_equipe()` é developer|administrador, e o
--     ProtectedRoute rebaixa builder para requester.
--   * A lixeira segue restrita: `is_equipe()` está DENTRO do ramo
--     `deleted_at IS NULL`, então soft-delete continua só para has_role(admin).
--   * Nada financeiro. `demands` não tem pontos nem valores — pontuação vive
--     em `relatorio_classificacao`, protegida por `pode_ver_remuneracao_de()`.

DROP POLICY IF EXISTS "demands_select_scoped" ON public.demands;

CREATE POLICY "demands_select_scoped"
  ON public.demands FOR SELECT
  TO authenticated
  USING (
    (
      deleted_at IS NULL
      AND (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        -- Envolvido em SELECT de propósito: o resultado não depende da linha,
        -- então o planejador avalia uma vez por consulta em vez de uma vez
        -- por linha de `demands`.
        OR (SELECT public.is_equipe())
      )
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );


-- ---------------------------------------------------------------------------
-- 2. O RELATÓRIO PASSA A DEVOLVER CLASSIFICAÇÃO E PONTOS
-- ---------------------------------------------------------------------------
--
-- `relatorio_implementacoes` foi escrita antes de a classificação existir.
-- Substituída para trazer também situação do fechamento, classificação,
-- pontos e justificativa — e para aceitar filtro por classificação e por
-- situação do fechamento.
--
-- Assinatura NOVA (dois parâmetros a mais). A antiga é derrubada
-- explicitamente, senão as duas coexistiriam por sobrecarga e o cliente
-- chamaria a errada dependendo dos argumentos.

DROP FUNCTION IF EXISTS public.relatorio_implementacoes(timestamptz, timestamptz, text, uuid, text);

CREATE OR REPLACE FUNCTION public.relatorio_implementacoes(
  _inicio        timestamptz,
  _fim           timestamptz,
  _sistema       text DEFAULT NULL,
  _responsavel   uuid DEFAULT NULL,
  _busca         text DEFAULT NULL,
  _classificacao text DEFAULT NULL,
  -- 'todos' | 'registrado' | 'pendente'
  _fechamento    text DEFAULT NULL
)
RETURNS TABLE (
  demanda_id        uuid,
  ticket_code       text,
  titulo            text,
  descricao         text,
  sistema_slug      text,
  tipo              text,
  prioridade        text,
  complexidade      text,
  status            text,
  responsavel_id    uuid,
  responsavel_nome  text,
  responsavel_email text,
  solicitante_id    uuid,
  solicitante_nome  text,
  solicitante_email text,
  criada_em         timestamptz,
  concluida_em      timestamptz,
  procedencia       text,
  evidencia         text,
  tarefas_total     integer,
  tarefas_feitas    integer,
  comentarios       integer,
  anexos            integer,
  -- Etapa 4
  fechamento        text,
  classificacao     text,
  classificacao_rotulo text,
  pontos            integer,
  justificativa     text,
  classificada_por  text,
  classificada_em   timestamptz,
  minutos_lancados  integer,
  ciclo_rotulo      text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.tem_capacidade('relatorios.ver') OR public.is_equipe()) THEN
    RAISE EXCEPTION 'Sem permissão para ver relatórios.'
      USING HINT = 'É preciso a capacidade relatorios.ver.';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.ticket_code,
    d.title,
    d.description,
    d.sistema_slug,
    d.type::text,
    d.priority::text,
    d.complexity::text,
    d.status::text,
    d.assigned_to,
    resp.nome,
    resp.email,
    d.created_by,
    sol.nome,
    sol.email,
    d.created_at,
    rcl.data_conclusao,
    coalesce(rcl.procedencia, 'nao_identificada'),
    rcl.evidencia_descricao,
    coalesce(t.total, 0)::integer,
    coalesce(t.feitas, 0)::integer,
    coalesce(k.n, 0)::integer,
    coalesce(a.n, 0)::integer,
    coalesce(f.situacao, 'sem_registro'),
    cls.classificacao,
    tipo.rotulo,
    cls.pontos,
    cls.justificativa,
    cls.definido_por_email,
    cls.definido_em,
    coalesce(iv.minutos, 0)::integer,
    cic.rotulo
  FROM public.demands d
  LEFT JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao_tipo tipo ON tipo.codigo = cls.classificacao
  LEFT JOIN public.profiles resp ON resp.id = d.assigned_to
  LEFT JOIN public.profiles sol  ON sol.id  = d.created_by
  LEFT JOIN public.relatorio_ciclo cic
         ON rcl.data_conclusao >= cic.inicio AND rcl.data_conclusao < cic.fim
  LEFT JOIN LATERAL (
    SELECT count(*) AS total, count(*) FILTER (WHERE completed) AS feitas
      FROM public.demand_tasks WHERE demand_id = d.id
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_comments
     WHERE demand_id = d.id AND NOT is_system AND NOT is_ai
  ) k ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_attachments WHERE demand_id = d.id
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT sum(EXTRACT(EPOCH FROM (i.fim - i.inicio)) / 60) AS minutos
      FROM public.relatorio_intervalo i WHERE i.demanda_id = d.id
  ) iv ON true
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    AND rcl.data_conclusao IS NOT NULL
    AND rcl.data_conclusao >= _inicio
    AND rcl.data_conclusao <  _fim
    AND (_sistema     IS NULL OR d.sistema_slug = _sistema)
    AND (_responsavel IS NULL OR d.assigned_to  = _responsavel)
    AND (_classificacao IS NULL OR _classificacao = 'todos'
         OR (_classificacao = 'sem_classificacao' AND cls.demanda_id IS NULL)
         OR cls.classificacao = _classificacao)
    AND (_fechamento IS NULL OR _fechamento = 'todos'
         OR (_fechamento = 'registrado' AND coalesce(f.situacao,'x') = 'concluido')
         OR (_fechamento = 'pendente'   AND coalesce(f.situacao,'x') <> 'concluido'))
    AND (
      _busca IS NULL OR _busca = ''
      OR d.title       ILIKE '%' || _busca || '%'
      OR d.description ILIKE '%' || _busca || '%'
      OR d.ticket_code ILIKE '%' || _busca || '%'
    )
  ORDER BY rcl.data_conclusao DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_implementacoes(
  timestamptz, timestamptz, text, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_implementacoes(
  timestamptz, timestamptz, text, uuid, text, text, text) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 3. O RESUMO DO CICLO — leitura, sem congelar nada
-- ---------------------------------------------------------------------------
--
-- Prepara o terreno para a apuração sem fazer o fechamento financeiro, que
-- depende de decisão do RH sobre a lacuna de 100,01% a 119,99%.
--
-- ATENÇÃO AO PREDICADO: `pode_ver_remuneracao_de`, nunca `is_equipe()`.
-- Um developer vê a própria linha; ver a dos outros exige
-- `remuneracao.ver_todas`. Sem isso, qualquer developer leria a pontuação do
-- colega — que é exatamente o vazamento que este módulo não pode ter.
--
-- Devolve PONTOS, não reais. A conversão para dinheiro depende da faixa, e a
-- faixa tem lacuna declarada — quem resolve isso é a tela, com a mensagem
-- "Faixa de remuneração não definida".

CREATE OR REPLACE FUNCTION public.relatorio_apuracao_do_ciclo(_ciclo_id uuid)
RETURNS TABLE (
  pessoa_id         uuid,
  pessoa_nome       text,
  pessoa_email      text,
  entregas          integer,
  classificadas     integer,
  sem_classificacao integer,
  sem_fechamento    integer,
  facil             integer,
  media             integer,
  dificil           integer,
  pontos            integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim    timestamptz;
BEGIN
  SELECT c.inicio, c.fim INTO v_inicio, v_fim
    FROM public.relatorio_ciclo c WHERE c.id = _ciclo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo não encontrado.';
  END IF;

  RETURN QUERY
  SELECT
    d.assigned_to,
    p.nome,
    p.email,
    count(*)::integer,
    count(*) FILTER (WHERE cls.demanda_id IS NOT NULL)::integer,
    count(*) FILTER (WHERE cls.demanda_id IS NULL)::integer,
    count(*) FILTER (WHERE coalesce(f.situacao,'x') <> 'concluido')::integer,
    count(*) FILTER (WHERE cls.classificacao = 'facil')::integer,
    count(*) FILTER (WHERE cls.classificacao = 'media')::integer,
    count(*) FILTER (WHERE cls.classificacao = 'dificil')::integer,
    coalesce(sum(cls.pontos), 0)::integer
  FROM public.demands d
  JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  LEFT JOIN public.relatorio_fechamento_tecnico f ON f.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  LEFT JOIN public.profiles p ON p.id = d.assigned_to
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    -- Só data CONFIRMADA entra na apuração. Inferida e não identificada ficam
    -- fora até alguém revisar — é a regra da Etapa 1, aplicada aqui.
    AND rcl.procedencia = 'confirmada'
    AND rcl.data_conclusao >= v_inicio
    AND rcl.data_conclusao <  v_fim
    AND d.assigned_to IS NOT NULL
    AND public.pode_ver_remuneracao_de(d.assigned_to)
  GROUP BY d.assigned_to, p.nome, p.email
  ORDER BY coalesce(sum(cls.pontos), 0) DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_apuracao_do_ciclo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_apuracao_do_ciclo(uuid)
  TO authenticated, service_role;
