-- ===========================================================================
-- A CLASSIFICAÇÃO ATUAL PASSA A VIR NA CONSULTA
-- ===========================================================================
--
-- `relatorio_pendencias_de_classificacao` devolvia só `ja_classificada`, um
-- booleano. Bastava para a fila de quem AINDA não foi classificada, que era o
-- caso de uso original.
--
-- Mas a mesma consulta alimenta a aba das já classificadas — e ali o booleano
-- não diz nada. O cartão exibia "classificada" sem dizer se foi Fácil, Médio
-- ou Difícil, nem quantos pontos valeu. Para descobrir era preciso abrir o
-- histórico, ou seja: a informação mais importante do cartão estava escondida
-- atrás de um clique.
--
-- Passa a devolver a decisão inteira. Assinatura sem parâmetros, então
-- `CREATE OR REPLACE` bastaria — mas o tipo de retorno mudou, e Postgres não
-- permite trocar o retorno de uma função existente. Daí o DROP.
-- ===========================================================================

DROP FUNCTION IF EXISTS public.relatorio_pendencias_de_classificacao();

CREATE OR REPLACE FUNCTION public.relatorio_pendencias_de_classificacao()
RETURNS TABLE (
  demanda_id       uuid,
  ticket_code      text,
  titulo           text,
  sistema_slug     text,
  responsavel_id   uuid,
  responsavel_nome text,
  concluida_em     timestamptz,
  minutos_lancados integer,
  problema         text,
  solucao          text,
  alterado         text,
  resultado        text,
  testes           text,
  tarefas_feitas   integer,
  tarefas_total    integer,
  anexos           integer,
  ja_classificada  boolean,
  -- A decisão, quando existe.
  classificacao    text,
  rotulo           text,
  pontos           integer,
  justificativa    text,
  classificada_por text,
  classificada_em  timestamptz,
  autoclassificada boolean,
  vezes_alterada   integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.tem_capacidade('classificacao.definir')
          OR public.tem_capacidade('relatorios.ver')
          OR public.is_equipe()) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  RETURN QUERY
  SELECT
    d.id, d.ticket_code, d.title, d.sistema_slug,
    d.assigned_to, p.nome,
    rcl.data_conclusao,
    coalesce(iv.minutos, 0)::integer,
    f.problema_identificado,
    f.solucao_implementada,
    f.o_que_foi_alterado,
    f.resultado_obtido,
    f.testes_realizados,
    coalesce(t.feitas, 0)::integer,
    coalesce(t.total, 0)::integer,
    coalesce(a.n, 0)::integer,
    (cls.demanda_id IS NOT NULL),
    cls.classificacao,
    tipo.rotulo,
    cls.pontos,
    cls.justificativa,
    cls.definido_por_email,
    cls.definido_em,
    coalesce(cls.autoclassificada, false),
    coalesce(h.n, 0)::integer
  FROM public.demands d
  JOIN public.relatorio_conclusao rcl ON rcl.demanda_id = d.id
  JOIN public.relatorio_fechamento_tecnico f
       ON f.demanda_id = d.id AND f.situacao = 'concluido'
  LEFT JOIN public.relatorio_classificacao cls ON cls.demanda_id = d.id
  LEFT JOIN public.relatorio_classificacao_tipo tipo ON tipo.codigo = cls.classificacao
  LEFT JOIN public.profiles p ON p.id = d.assigned_to
  LEFT JOIN LATERAL (
    SELECT sum(EXTRACT(EPOCH FROM (i.fim - i.inicio)) / 60) AS minutos
      FROM public.relatorio_intervalo i WHERE i.demanda_id = d.id
  ) iv ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS total, count(*) FILTER (WHERE completed) AS feitas
      FROM public.demand_tasks WHERE demand_id = d.id
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.demand_attachments WHERE demand_id = d.id
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.relatorio_classificacao_historico hh
     WHERE hh.demanda_id = d.id AND hh.origem = 'alteracao'
  ) h ON true
  WHERE d.deleted_at IS NULL AND rcl.procedencia = 'confirmada'
  ORDER BY (cls.demanda_id IS NOT NULL), rcl.data_conclusao DESC;
END $$;

REVOKE ALL ON FUNCTION public.relatorio_pendencias_de_classificacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_pendencias_de_classificacao()
  TO authenticated, service_role;
