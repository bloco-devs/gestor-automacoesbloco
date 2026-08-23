-- ===========================================================================
-- ETAPA 2 — A CONSULTA DO RELATÓRIO TÉCNICO
-- ===========================================================================
--
-- POR QUE ISTO PRECISA SER `SECURITY DEFINER`
--
-- A política de leitura de `demands` é por dono:
--   created_by = auth.uid() OR assigned_to = auth.uid() OR has_role(admin)
--
-- A pessoa do RH é `requester`. Ela não criou nem foi designada para nenhuma
-- demanda da equipe, e não é admin — então, por consulta comum, ela veria
-- exatamente ZERO linhas. E o pior: sem erro nenhum. RLS não recusa, só
-- devolve menos.
--
-- Então a leitura passa por uma função que roda com privilégio e faz a
-- checagem de acesso DENTRO dela. Mesmo padrão de `get_user_workloads()`,
-- que é o único caminho do projeto que hoje enxerga demanda de todo mundo.
--
-- Efeito colateral bom: a função devolve só as colunas do relatório. O RH vê
-- título, sistema, responsável e datas — não vê comentário interno.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Relatório técnico: o que foi concluído num intervalo
-- ---------------------------------------------------------------------------
--
-- O intervalo é SEMIABERTO (`>= inicio AND < fim`), igual ao resto do módulo.
--
-- Aceita demanda com data `inferida` e até `nao_identificada`, porque isto é
-- o HISTÓRICO TÉCNICO — ele mostra tudo que foi feito. Quem filtra por
-- procedência é a apuração da folha, não este relatório. A procedência vai
-- na resposta para a tela poder marcar visualmente o que é registro e o que
-- é inferência.

CREATE OR REPLACE FUNCTION public.relatorio_implementacoes(
  _inicio      timestamptz,
  _fim         timestamptz,
  _sistema     text DEFAULT NULL,
  _responsavel uuid DEFAULT NULL,
  _busca       text DEFAULT NULL
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
  anexos            integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- A checagem de acesso mora aqui, porque a RLS foi contornada de propósito.
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
    rc.data_conclusao,
    coalesce(rc.procedencia, 'nao_identificada'),
    rc.evidencia_descricao,
    coalesce(t.total, 0)::integer,
    coalesce(t.feitas, 0)::integer,
    coalesce(k.n, 0)::integer,
    coalesce(a.n, 0)::integer
  FROM public.demands d
  LEFT JOIN public.relatorio_conclusao rc ON rc.demanda_id = d.id
  LEFT JOIN public.profiles resp ON resp.id = d.assigned_to
  LEFT JOIN public.profiles sol  ON sol.id  = d.created_by
  LEFT JOIN LATERAL (
    SELECT count(*) AS total, count(*) FILTER (WHERE completed) AS feitas
      FROM public.demand_tasks WHERE demand_id = d.id
  ) t ON true
  LEFT JOIN LATERAL (
    -- Só comentário de gente. Aviso automático e resposta da IA não são
    -- registro de trabalho humano e inflariam o número sem significar nada.
    SELECT count(*) AS n FROM public.demand_comments
     WHERE demand_id = d.id AND NOT is_system AND NOT is_ai
  ) k ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_attachments WHERE demand_id = d.id
  ) a ON true
  WHERE d.deleted_at IS NULL
    AND d.status = 'concluido'
    AND rc.data_conclusao IS NOT NULL
    AND rc.data_conclusao >= _inicio
    AND rc.data_conclusao <  _fim
    AND (_sistema     IS NULL OR d.sistema_slug = _sistema)
    AND (_responsavel IS NULL OR d.assigned_to  = _responsavel)
    AND (
      _busca IS NULL OR _busca = ''
      OR d.title       ILIKE '%' || _busca || '%'
      OR d.description ILIKE '%' || _busca || '%'
      OR d.ticket_code ILIKE '%' || _busca || '%'
    )
  ORDER BY rc.data_conclusao DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_implementacoes(timestamptz, timestamptz, text, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_implementacoes(timestamptz, timestamptz, text, uuid, text)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- Os filtros da tela: quais sistemas e quais pessoas têm entrega no período
-- ---------------------------------------------------------------------------
-- Preenche os seletores só com o que existe de fato. Um seletor com 15
-- sistemas dos quais 13 nunca tiveram entrega é ruído.

CREATE OR REPLACE FUNCTION public.relatorio_filtros(
  _inicio timestamptz,
  _fim    timestamptz
)
RETURNS TABLE (
  tipo       text,   -- 'sistema' | 'responsavel'
  valor      text,
  rotulo     text,
  quantidade integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.tem_capacidade('relatorios.ver') OR public.is_equipe()) THEN
    RAISE EXCEPTION 'Sem permissão para ver relatórios.';
  END IF;

  RETURN QUERY
  SELECT 'sistema'::text,
         coalesce(d.sistema_slug, '(sem sistema)'),
         coalesce(d.sistema_slug, 'Sem sistema identificado'),
         count(*)::integer
    FROM public.demands d
    JOIN public.relatorio_conclusao rc ON rc.demanda_id = d.id
   WHERE d.deleted_at IS NULL AND d.status = 'concluido'
     AND rc.data_conclusao >= _inicio AND rc.data_conclusao < _fim
   GROUP BY d.sistema_slug

  UNION ALL

  SELECT 'responsavel'::text,
         d.assigned_to::text,
         coalesce(p.nome, p.email, 'Sem responsável'),
         count(*)::integer
    FROM public.demands d
    JOIN public.relatorio_conclusao rc ON rc.demanda_id = d.id
    LEFT JOIN public.profiles p ON p.id = d.assigned_to
   WHERE d.deleted_at IS NULL AND d.status = 'concluido'
     AND rc.data_conclusao >= _inicio AND rc.data_conclusao < _fim
     AND d.assigned_to IS NOT NULL
   GROUP BY d.assigned_to, p.nome, p.email

  ORDER BY 1, 4 DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_filtros(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_filtros(timestamptz, timestamptz)
  TO authenticated, service_role;
