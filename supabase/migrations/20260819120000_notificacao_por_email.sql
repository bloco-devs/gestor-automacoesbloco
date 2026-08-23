-- Aviso por email para o solicitante
--
-- O PROBLEMA
--
-- O solicitante abre a demanda e some. Ele não volta ao sistema para ver em
-- que pé está, e o sino de notificações só existe para quem já está dentro —
-- ou seja, para quem não precisa dele. Quem precisa é justamente quem não
-- entra. O email é o único canal onde essa pessoa já está todo dia, e é o
-- único cujo encanamento já existe aqui: `confirmar-atendimento-existente`
-- manda email pelo HUB desde sempre.
--
--
-- QUANDO AVISAR — E POR QUE NÃO É "TODA MUDANÇA DE STATUS"
--
-- Mandar um email a cada troca de status transformaria a caixa de entrada em
-- ruído e o aviso em coisa que se aprende a ignorar. Mas escolher os status "a
-- dedo" seria uma lista arbitrária, que envelhece na primeira vez que alguém
-- mexer no fluxo.
--
-- A regra sai de graça de uma decisão que o produto já tomou: o solicitante
-- nunca vê o status técnico. `humanizeStatus` (FEATURE 026.2) traduz os seis
-- status do enum em quatro rótulos, e nessa tradução dois pares colapsam:
--
--     backlog ─┐
--              ├─► "Em análise"
--     a_fazer ─┘
--
--     em_desenvolvimento ─┐
--                         ├─► "Em desenvolvimento"
--     em_testes ──────────┘
--
--     homologacao ────────► "Aguardando validação"
--     concluido ──────────► "Concluída"
--
-- Então a regra é: avisa quando muda o RÓTULO, não quando muda o status.
--
-- O que isso mata sozinho, sem lista nenhuma:
--   • o ping-pong de triagem entre backlog e a_fazer;
--   • o vai-e-vem interno entre desenvolvimento e testes, que para quem pediu
--     é a mesma coisa acontecendo.
--
-- O que sobra são os três momentos que significam algo para quem pediu —
-- "começaram", "é sua vez de olhar", "acabou" — mais o recibo da criação.
-- Quatro emails no ciclo inteiro de uma demanda.
--
--
-- POR QUE NO BANCO, E NÃO NO WEBHOOK QUE JÁ EXISTE
--
-- `updateDemandStatus` já dispara `demand.status_changed` para os webhooks
-- cadastrados, e seria o caminho curto. Mas esse disparo sai do NAVEGADOR,
-- fire-and-forget: fechar a aba no segundo seguinte engole o aviso, e nada que
-- mexa no status por fora da interface — SQL, painel do Supabase, uma function
-- futura — dispara coisa alguma. Aviso que some sem deixar rastro é pior do
-- que aviso que não existe, porque ninguém desconfia.
--
-- No trigger, os treze caminhos de UI que hoje mudam status (arrastar cartão,
-- dropdown do card, dropdown do detalhe, botão Concluir, Copiloto...) passam a
-- valer de uma vez, e qualquer caminho novo já nasce coberto.
--
--
-- POR QUE UMA FILA, E NÃO ENVIAR NA HORA
--
-- O trigger não pode enviar email: uma chamada HTTP dentro da transação
-- deixaria o usuário esperando o servidor de email para conseguir arrastar um
-- cartão, e um email fora do ar viraria erro ao mover a demanda. A fila separa
-- as duas coisas — o trigger só registra a intenção, e quem envia é uma edge
-- function chamada pelo cron. De brinde vem retentativa, histórico do que foi
-- mandado para quem, e a resposta para a pergunta que sempre aparece depois:
-- "mas o email chegou?".

-- ---------------------------------------------------------------------------
-- 1. Tradução do status para o que o solicitante enxerga
-- ---------------------------------------------------------------------------
-- Espelho SQL de `humanizeStatus` em src/modules/portal-unified/statusHuman.ts.
-- Mexeu lá, mexe aqui: são a mesma regra em dois lugares porque o trigger não
-- alcança o TypeScript. O teste em src/modules/notificacao-email/ trava as duas
-- listas juntas para que a divergência apareça no CI, e não na caixa de
-- entrada de alguém.
CREATE OR REPLACE FUNCTION public.rotulo_humano_status(s public.demand_status)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE s
    WHEN 'backlog'            THEN 'Em análise'
    WHEN 'a_fazer'            THEN 'Em análise'
    WHEN 'em_desenvolvimento' THEN 'Em desenvolvimento'
    WHEN 'em_testes'          THEN 'Em desenvolvimento'
    WHEN 'homologacao'        THEN 'Aguardando validação'
    WHEN 'concluido'          THEN 'Concluída'
    ELSE 'Em andamento'
  END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Preferências por pessoa
-- ---------------------------------------------------------------------------
-- Ausência de linha significa TUDO LIGADO. É opt-out, não opt-in: é email
-- corporativo, sobre um pedido que a própria pessoa fez, para a conta que ela
-- usa para trabalhar. Exigir cadastro prévio faria o recurso nascer com zero
-- alcance — que é exatamente o problema que ele veio resolver.
CREATE TABLE IF NOT EXISTS public.notificacao_preferencias (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_ativo          boolean NOT NULL DEFAULT true,  -- chave geral
  email_demanda_criada boolean NOT NULL DEFAULT true,  -- "recebemos seu pedido"
  email_mudanca_status boolean NOT NULL DEFAULT true,  -- "começaram" / "é sua vez"
  email_concluida      boolean NOT NULL DEFAULT true,  -- "acabou"
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacao_preferencias ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.notificacao_preferencias TO authenticated;
GRANT ALL ON public.notificacao_preferencias TO service_role;

DROP POLICY IF EXISTS notif_pref_select_own ON public.notificacao_preferencias;
CREATE POLICY notif_pref_select_own ON public.notificacao_preferencias
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notif_pref_insert_own ON public.notificacao_preferencias;
CREATE POLICY notif_pref_insert_own ON public.notificacao_preferencias
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notif_pref_update_own ON public.notificacao_preferencias;
CREATE POLICY notif_pref_update_own ON public.notificacao_preferencias
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS notif_pref_set_updated_at ON public.notificacao_preferencias;
CREATE TRIGGER notif_pref_set_updated_at
  BEFORE UPDATE ON public.notificacao_preferencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. A fila
-- ---------------------------------------------------------------------------
-- `dados` guarda o conteúdo cru (ticket, título, nome, rótulo), não o HTML
-- pronto. Assunto e corpo são montados na edge function, onde template é
-- código e não migration — trocar uma palavra do email não pode exigir mexer
-- no banco.
CREATE TABLE IF NOT EXISTS public.notificacao_email_fila (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  destinatario_email text NOT NULL,
  demanda_id         uuid REFERENCES public.demands(id) ON DELETE CASCADE,
  evento             text NOT NULL,
  dados              jsonb NOT NULL DEFAULT '{}'::jsonb,
  situacao           text NOT NULL DEFAULT 'pendente',
  tentativas         int  NOT NULL DEFAULT 0,
  ultimo_erro        text,
  enviado_em         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notif_fila_evento_valido
    CHECK (evento IN ('demanda_criada', 'status_mudou', 'demanda_concluida')),
  CONSTRAINT notif_fila_situacao_valida
    CHECK (situacao IN ('pendente', 'enviado', 'falhou', 'cancelado'))
);

-- Índice parcial: quem drena a fila só enxerga pendente, e a tabela vai
-- crescer para sempre com linhas enviadas que esse índice nem toca.
CREATE INDEX IF NOT EXISTS notif_fila_pendentes
  ON public.notificacao_email_fila (created_at)
  WHERE situacao = 'pendente';

-- Sustenta a checagem de repetição do trigger.
CREATE INDEX IF NOT EXISTS notif_fila_dedup
  ON public.notificacao_email_fila (demanda_id, evento, created_at DESC);

ALTER TABLE public.notificacao_email_fila ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.notificacao_email_fila TO authenticated;
GRANT ALL ON public.notificacao_email_fila TO service_role;

-- Ninguém INSERE nesta tabela pela interface: quem enfileira é o trigger
-- (SECURITY DEFINER) e quem envia é a edge function (service role). Sem policy
-- de INSERT para `authenticated`, de propósito — mesmo padrão de
-- `notifications` e `demand_audit_logs`.
DROP POLICY IF EXISTS notif_fila_select_equipe ON public.notificacao_email_fila;
CREATE POLICY notif_fila_select_equipe ON public.notificacao_email_fila
  FOR SELECT TO authenticated
  USING (destinatario_id = auth.uid() OR public.is_equipe());

-- UPDATE existe por causa de um botão só: "tentar de novo", no painel. Um
-- email que falhou três vezes por causa de instabilidade do HUB fica parado
-- para sempre sem isso, e a alternativa seria abrir o SQL editor para
-- ressuscitar linha na mão.
DROP POLICY IF EXISTS notif_fila_update_equipe ON public.notificacao_email_fila;
CREATE POLICY notif_fila_update_equipe ON public.notificacao_email_fila
  FOR UPDATE TO authenticated
  USING (public.is_equipe())
  WITH CHECK (public.is_equipe());

-- ---------------------------------------------------------------------------
-- 4. O trigger que enfileira
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_demanda_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento     text;
  v_email      text;
  v_nome       text;
  v_rotulo_de  text;
  v_rotulo_para text;
  v_prefs      public.notificacao_preferencias%ROWTYPE;
  v_tem_prefs  boolean;
  v_ligado     boolean;
BEGIN
  -- Demanda na lixeira não gera aviso.
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_evento      := 'demanda_criada';
    v_rotulo_para := public.rotulo_humano_status(NEW.status);

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    v_rotulo_de   := public.rotulo_humano_status(OLD.status);
    v_rotulo_para := public.rotulo_humano_status(NEW.status);

    -- A REGRA. Se o solicitante lê a mesma frase antes e depois, não
    -- aconteceu nada do ponto de vista dele.
    IF v_rotulo_de = v_rotulo_para THEN
      RETURN NEW;
    END IF;

    -- Quem mexeu na própria demanda já sabe o que fez.
    IF auth.uid() IS NOT DISTINCT FROM NEW.created_by THEN
      RETURN NEW;
    END IF;

    v_evento := CASE
      WHEN NEW.status = 'concluido' THEN 'demanda_concluida'
      ELSE 'status_mudou'
    END;

  ELSE
    RETURN NEW;
  END IF;

  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.email, p.nome INTO v_email, v_nome
  FROM public.profiles p
  WHERE p.id = NEW.created_by;

  -- Sem email não há o que fazer, e não vale enfileirar para falhar depois.
  IF v_email IS NULL OR btrim(v_email) = '' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_prefs
  FROM public.notificacao_preferencias
  WHERE user_id = NEW.created_by;
  v_tem_prefs := FOUND;

  IF v_tem_prefs THEN
    IF NOT v_prefs.email_ativo THEN
      RETURN NEW;
    END IF;
    v_ligado := CASE v_evento
      WHEN 'demanda_criada'    THEN v_prefs.email_demanda_criada
      WHEN 'status_mudou'      THEN v_prefs.email_mudanca_status
      WHEN 'demanda_concluida' THEN v_prefs.email_concluida
      ELSE true
    END;
    IF NOT v_ligado THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Repetição em 10 minutos: mesma janela que `trg_demand_comment_notify` já
  -- usa para comentários. Cobre o caso de o dev arrastar o cartão para a
  -- coluna errada e corrigir em seguida — dois movimentos, um email.
  IF EXISTS (
    SELECT 1 FROM public.notificacao_email_fila f
    WHERE f.demanda_id = NEW.id
      AND f.evento     = v_evento
      AND f.created_at > now() - interval '10 minutes'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notificacao_email_fila
    (destinatario_id, destinatario_email, demanda_id, evento, dados)
  VALUES (
    NEW.created_by,
    v_email,
    NEW.id,
    v_evento,
    jsonb_build_object(
      'ticket_code',  NEW.ticket_code,
      'titulo',       NEW.title,
      -- Primeiro nome só: "Olá, André" lê melhor que o nome completo, e o
      -- trecho antes do @ salva o caso de `profiles.nome` vazio.
      'nome',         split_part(
                        COALESCE(NULLIF(btrim(v_nome), ''), split_part(v_email, '@', 1)),
                        ' ', 1),
      'rotulo',       v_rotulo_para,
      'rotulo_antes', v_rotulo_de,
      'status',       NEW.status::text
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_demanda_email ON public.demands;
CREATE TRIGGER trg_demanda_email
  AFTER INSERT OR UPDATE ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.trg_demanda_email();

-- ---------------------------------------------------------------------------
-- 5. Agendamento — PASSO MANUAL, feito uma única vez
-- ---------------------------------------------------------------------------
-- O cron NÃO é criado aqui, pela mesma razão registrada em
-- 20260628010631: a chamada precisa da SUPABASE_SERVICE_ROLE_KEY no header, e
-- segredo não entra em SQL versionado.
--
-- Um administrador roda o bloco abaixo UMA VEZ no SQL Editor do Supabase
-- (projeto cgbhpenkytibgiosksrb), trocando <SERVICE_ROLE_KEY>. Enquanto isso
-- não acontece, a fila enche e ninguém recebe nada — o botão "Processar
-- agora" do painel serve de muleta, mas não substitui o cron.
--
--   select cron.schedule(
--     'notificacao-email-fila',
--     '* * * * *',
--     $cron$
--       select net.http_post(
--         url := 'https://cgbhpenkytibgiosksrb.supabase.co/functions/v1/notificacao-email-fila',
--         headers := jsonb_build_object(
--           'Content-Type','application/json',
--           'Authorization','Bearer <SERVICE_ROLE_KEY>'
--         ),
--         body := '{}'::jsonb
--       );
--     $cron$
--   );
--
-- Para conferir se está de pé:   select * from cron.job;
-- Para ver as últimas execuções: select * from cron.job_run_details
--                                order by start_time desc limit 20;
-- Para desligar:                 select cron.unschedule('notificacao-email-fila');
