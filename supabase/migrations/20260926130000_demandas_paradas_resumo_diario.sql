-- O Blink avisa quando uma demanda fica parada
--
-- "PARADA" É DEFINIDO POR DIAS ÚTEIS, NÃO POR DIAS CORRIDOS
--
-- Uma demanda que passa sexta e o fim de semana sem andar não esperou 3 dias
-- de descaso — esperou 1 dia útil (a sexta) mais o fim de semana, em que
-- ninguém deveria estar trabalhando nela mesmo. Contar dias corridos geraria
-- lembrete toda segunda de manhã para todo mundo, cedo demais para significar
-- algo. `dias_uteis_entre()` conta só segunda a sexta.
--
-- Não existe tabela de feriado no sistema, então feriado não é descontado —
-- mesma limitação já aceita em outras contas de data do projeto.
--
-- QUEM É AVISADO, E POR QUÊ SÃO REGRAS DIFERENTES
--
--   • Em desenvolvimento / Em testes, sem mexer há 3 dias úteis → quem está
--     COM a demanda (`assigned_to`). É trabalho dele que não anda.
--   • Em homologação, sem mexer há 3 dias úteis → quem ABRIU a demanda
--     (`created_by`). A bola está com ele: só ele pode validar.
--   • Backlog e A fazer ficam de fora: ainda não foram assumidas, "parada"
--     ali é fila, não descaso.
--
-- POR QUE UM RESUMO, E NÃO UM AVISO POR DEMANDA
--
-- Decisão de produto: quem tem cinco demandas paradas recebe uma mensagem
-- contando as cinco, não cinco mensagens. Por isso o evento novo,
-- `demanda_parada`, não é por-demanda como os outros — é por-pessoa, com a
-- lista inteira em `dados.itens`. `demanda_id` fica nulo na fila: a mensagem
-- não é sobre uma demanda, é sobre o dia de alguém.
--
-- COMO O ENVIO ACONTECE SEM PRECISAR DE OUTRO SEGREDO
--
-- Os outros eventos são enfileirados por TRIGGER, na hora em que algo muda.
-- Este é por TEMPO, não por mudança — precisa de agenda, não de gatilho. Mas
-- "enfileirar" aqui é só um INSERT em SQL: não precisa chamar a edge function
-- para isso. `enfileirar_resumo_demandas_paradas()` roda dentro do banco,
-- chamada por um SEGUNDO job do pg_cron, uma vez por dia — sem token, sem
-- HTTP, sem segredo novo. Quem realmente manda a mensagem continua sendo o
-- job de 1-em-1-minuto que já existe (`notificacao-whatsapp-fila`, criado em
-- 20260924120000): ele lê a fila de novo em até 1 minuto e envia dali.
--
-- Sem literal acentuado no corpo das funções: aplicada pelo SQL Editor do
-- Supabase, que corrompe acento colado.

-- ---------------------------------------------------------------------------
-- 1. O evento novo na fila
-- ---------------------------------------------------------------------------

ALTER TABLE public.notificacao_whatsapp_fila
  DROP CONSTRAINT IF EXISTS notif_wa_evento_valido;
ALTER TABLE public.notificacao_whatsapp_fila
  ADD CONSTRAINT notif_wa_evento_valido
  CHECK (evento IN (
    'demanda_criada', 'coluna_mudou', 'demanda_concluida',
    'dev_demanda_nova', 'mensagem_chat', 'demanda_parada'
  ));

-- ---------------------------------------------------------------------------
-- 2. Dias uteis entre duas datas
-- ---------------------------------------------------------------------------
-- Conta segunda a sexta estritamente APOS o dia de `_inicio` ate o dia de
-- `_fim`, inclusive. Uma demanda tocada na sexta as 17h e olhada de novo na
-- segunda as 9h teve 1 dia util no meio (a propria segunda) — sabado e
-- domingo nao contam.

CREATE OR REPLACE FUNCTION public.dias_uteis_entre(_inicio timestamptz, _fim timestamptz)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::integer
  FROM generate_series(
         date_trunc('day', _inicio) + interval '1 day',
         date_trunc('day', _fim),
         interval '1 day'
       ) AS d
  WHERE extract(isodow FROM d) < 6;  -- isodow: 1=segunda .. 7=domingo
$$;

-- ---------------------------------------------------------------------------
-- 3. Enfileira o resumo do dia, uma vez por pessoa
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enfileirar_resumo_demandas_paradas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limiar constant integer := 3;
  v_max_itens constant integer := 12;
  v_inseridos integer := 0;
  v_pessoa record;
BEGIN
  -- Uma linha por PESSOA que tem pelo menos uma demanda parada, com a lista
  -- inteira dela dentro de `itens`. `papel` distingue o texto da mensagem
  -- (dev sendo cobrado do proprio trabalho vs solicitante que precisa validar)
  -- sem precisar de duas passadas.
  FOR v_pessoa IN
    WITH paradas AS (
      SELECT
        d.id, d.ticket_code, d.title,
        CASE WHEN d.status = 'homologacao' THEN d.created_by ELSE d.assigned_to END AS destinatario_id,
        CASE WHEN d.status = 'homologacao' THEN 'solicitante' ELSE 'dev' END AS papel,
        public.dias_uteis_entre(d.updated_at, now()) AS dias
      FROM public.demands d
      WHERE d.deleted_at IS NULL
        AND d.status IN ('em_desenvolvimento', 'em_testes', 'homologacao')
        AND (
          (d.status IN ('em_desenvolvimento', 'em_testes') AND d.assigned_to IS NOT NULL)
          OR (d.status = 'homologacao' AND d.created_by IS NOT NULL)
        )
    )
    SELECT
      p.destinatario_id,
      p.papel,
      pref.whatsapp_telefone,
      prof.nome,
      prof.email,
      jsonb_agg(
        jsonb_build_object(
          'demanda_id',  p.id,
          'ticket_code', p.ticket_code,
          'titulo',      p.title,
          'dias',        p.dias
        )
        ORDER BY p.dias DESC
      ) FILTER (WHERE true) AS itens,
      count(*) AS total
    FROM paradas p
    JOIN public.notificacao_preferencias pref ON pref.user_id = p.destinatario_id
    LEFT JOIN public.profiles prof ON prof.id = p.destinatario_id
    WHERE p.dias >= v_limiar
      AND pref.whatsapp_ativo
      AND pref.whatsapp_telefone IS NOT NULL
      -- Ja mandou o resumo de hoje para esta pessoa? Nao manda de novo. O
      -- cron so dispara 1x ao dia, mas a funcao pode ser chamada a mao.
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacao_whatsapp_fila f
        WHERE f.destinatario_id = p.destinatario_id
          AND f.evento = 'demanda_parada'
          AND f.created_at::date = current_date
      )
    GROUP BY p.destinatario_id, p.papel, pref.whatsapp_telefone, prof.nome, prof.email
  LOOP
    INSERT INTO public.notificacao_whatsapp_fila
      (destinatario_id, telefone, demanda_id, evento, dados)
    VALUES (
      v_pessoa.destinatario_id,
      v_pessoa.whatsapp_telefone,
      NULL,
      'demanda_parada',
      jsonb_build_object(
        'nome',   split_part(
                    COALESCE(NULLIF(btrim(v_pessoa.nome), ''),
                             split_part(COALESCE(v_pessoa.email, ''), '@', 1)),
                    ' ', 1),
        'papel',  v_pessoa.papel,
        'total',  v_pessoa.total,
        -- Corta a lista, nao a mensagem toda: quem tem 20 paradas ve as 12
        -- mais antigas e sabe que ha mais, em vez de receber uma parede de
        -- texto ou nada.
        'itens',  (SELECT jsonb_agg(x) FROM jsonb_array_elements(v_pessoa.itens) WITH ORDINALITY t(x, i)
                   WHERE i <= v_max_itens)
      )
    );
    v_inseridos := v_inseridos + 1;
  END LOOP;

  RETURN v_inseridos;
END;
$$;

REVOKE ALL ON FUNCTION public.enfileirar_resumo_demandas_paradas() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. O agendamento — dentro desta migration, sem segredo
-- ---------------------------------------------------------------------------
-- Chama a funcao acima DIRETO, sem HTTP: pg_cron ja esta habilitado neste
-- projeto (e o que roda o job 'notificacao-whatsapp-fila' desde 20260924).
-- Sem chave de API nenhuma envolvida aqui, entao — ao contrario do cron que
-- fala com a edge function — este pode morar direto na migration.
--
-- Horario: 12:00 UTC = 09:00 America/Sao_Paulo (Brasil nao tem horario de
-- verao desde 2019). Só de segunda a sexta: nao ha por que gerar o resumo no
-- fim de semana em que ninguem deveria estar olhando o WhatsApp de trabalho.
--
-- cron.schedule faz upsert pelo nome do job: rodar esta migration de novo
-- atualiza o horario em vez de duplicar o agendamento.

SELECT cron.schedule(
  'demandas-paradas-resumo-diario',
  '0 12 * * 1-5',
  $cron$ SELECT public.enfileirar_resumo_demandas_paradas(); $cron$
);

-- Para conferir: select * from cron.job where jobname = 'demandas-paradas-resumo-diario';
-- Para rodar na hora, sem esperar o cron: select public.enfileirar_resumo_demandas_paradas();
-- Para desligar:  select cron.unschedule('demandas-paradas-resumo-diario');
