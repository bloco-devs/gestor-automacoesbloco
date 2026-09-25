-- Aviso por WhatsApp para o solicitante — o Blink acompanha a demanda
--
-- O QUE MUDA EM RELAÇÃO AO EMAIL
--
-- A estrutura é a mesma de 20260819120000_notificacao_por_email.sql, e pelas
-- mesmas razões: trigger no banco (cobre todo caminho que mexe no status,
-- inclusive os que não passam pela interface), fila separada da transação
-- (mover um cartão não pode esperar o WhatsApp responder), e uma edge function
-- que drena pelo cron. Quatro coisas são diferentes, e cada uma é decisão:
--
-- 1. OPT-IN, NÃO OPT-OUT.
--    O email é padrão ligado: vai para a conta corporativa, sobre um pedido
--    que a própria pessoa fez. WhatsApp vai para um número de telefone, muitas
--    vezes pessoal. Só recebe quem marcou "acompanhar pelo WhatsApp" e deu o
--    número — e o momento do aceite fica gravado em `whatsapp_consentido_em`.
--    O CHECK abaixo impede que exista `whatsapp_ativo` sem os dois.
--
-- 2. CADA MUDANÇA DE COLUNA GERA MENSAGEM.
--    O email só avisa quando muda o rótulo humano, e por isso junta
--    backlog/a_fazer e desenvolvimento/testes. Aqui a decisão foi outra: o
--    solicitante acompanha coluna a coluna, até a conclusão. O que continua
--    valendo é o filtro de repetição de 10 minutos por destino — ele não
--    esconde movimento, esconde o cartão arrastado para a coluna errada e
--    devolvido no minuto seguinte.
--
-- 3. O SQL NÃO CARREGA NENHUM TEXTO COM ACENTO.
--    O SQL Editor do Supabase corrompe acento colado, e esta migration é
--    aplicada por lá. Por isso o trigger grava só o status cru do enum
--    (`homologacao`, `concluido`, tudo ASCII) e o nome da coluna ("Homologação",
--    "Concluída") é montado na edge function, em TypeScript. Efeito colateral
--    bom: não há uma segunda cópia da tabela de rótulos em SQL para divergir.
--
-- 4. UMA SITUAÇÃO A MAIS NA FILA: `incerto`.
--    A documentação da Uazapi é explícita: um timeout deixa o resultado
--    incerto — a mensagem pode ter sido entregue — e envio de mensagem não
--    deve ser repetido às cegas. O email retenta três vezes; aqui isso faria
--    gente receber a mesma mensagem duas vezes. Então a edge function reserva
--    a linha como `incerto` ANTES de chamar a API, e só depois do resultado
--    decide: `enviado`, `falhou`, ou de volta a `pendente` quando a própria
--    API disse que foi limite ou erro dela (429/5xx). Uma linha que fica em
--    `incerto` é uma pergunta para uma pessoa, não para o cron.
--
--
-- A RESOLUÇÃO DA DEMANDA
--
-- Ao concluir, o front faz três chamadas separadas: muda o status, posta o
-- resumo no chat, grava o relato técnico. O trigger dispara na primeira — e o
-- relato ainda não existe. Por isso a mensagem de conclusão NÃO leva o texto
-- da resolução no enfileiramento: a edge function busca
-- `relatorio_fechamento_tecnico.solucao_implementada` na hora de enviar, e
-- espera alguns minutos por ele antes de mandar sem.

-- ---------------------------------------------------------------------------
-- 1. O aceite, nas preferências que já existem
-- ---------------------------------------------------------------------------

ALTER TABLE public.notificacao_preferencias
  ADD COLUMN IF NOT EXISTS whatsapp_ativo         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_telefone      text,
  ADD COLUMN IF NOT EXISTS whatsapp_consentido_em timestamptz;

-- Formato que a Uazapi pede: DDI 55 + DDD + número, só dígitos, sem "+".
-- DDD brasileiro não tem zero em nenhuma das duas casas. O número aceita 8 ou
-- 9 dígitos porque WhatsApp Business roda em fixo também.
ALTER TABLE public.notificacao_preferencias
  DROP CONSTRAINT IF EXISTS notif_pref_whatsapp_telefone_valido;
ALTER TABLE public.notificacao_preferencias
  ADD CONSTRAINT notif_pref_whatsapp_telefone_valido
  CHECK (whatsapp_telefone IS NULL OR whatsapp_telefone ~ '^55[1-9]{2}[0-9]{8,9}$');

ALTER TABLE public.notificacao_preferencias
  DROP CONSTRAINT IF EXISTS notif_pref_whatsapp_com_aceite;
ALTER TABLE public.notificacao_preferencias
  ADD CONSTRAINT notif_pref_whatsapp_com_aceite
  CHECK (
    NOT whatsapp_ativo
    OR (whatsapp_telefone IS NOT NULL AND whatsapp_consentido_em IS NOT NULL)
  );

-- ---------------------------------------------------------------------------
-- 2. A fila
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notificacao_whatsapp_fila (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Copiado no enfileiramento: se a pessoa trocar o número depois, o histórico
  -- continua dizendo para onde cada mensagem foi.
  telefone              text NOT NULL,
  demanda_id            uuid REFERENCES public.demands(id) ON DELETE CASCADE,
  evento                text NOT NULL,
  dados                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  situacao              text NOT NULL DEFAULT 'pendente',
  tentativas            int  NOT NULL DEFAULT 0,
  proxima_tentativa_em  timestamptz,
  reservado_em          timestamptz,
  ultimo_erro           text,
  provedor_mensagem_id  text,
  enviado_em            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notif_wa_situacao_valida
    CHECK (situacao IN ('pendente', 'enviado', 'falhou', 'cancelado', 'incerto')),
  CONSTRAINT notif_wa_evento_valido
    CHECK (evento IN ('demanda_criada', 'coluna_mudou', 'demanda_concluida'))
);

CREATE INDEX IF NOT EXISTS notif_wa_pendentes
  ON public.notificacao_whatsapp_fila (created_at)
  WHERE situacao = 'pendente';

CREATE INDEX IF NOT EXISTS notif_wa_dedup
  ON public.notificacao_whatsapp_fila (demanda_id, created_at);

ALTER TABLE public.notificacao_whatsapp_fila ENABLE ROW LEVEL SECURITY;

-- Ninguém insere pela interface: quem enfileira é o trigger, com SECURITY
-- DEFINER. A equipe pode ler e mudar a situação (cancelar, devolver um
-- `incerto` para `pendente` depois de conferir que não chegou).
GRANT SELECT, UPDATE ON public.notificacao_whatsapp_fila TO authenticated;

DROP POLICY IF EXISTS notif_wa_select ON public.notificacao_whatsapp_fila;
CREATE POLICY notif_wa_select ON public.notificacao_whatsapp_fila
  FOR SELECT TO authenticated
  USING (destinatario_id = auth.uid() OR public.is_equipe());

DROP POLICY IF EXISTS notif_wa_update_equipe ON public.notificacao_whatsapp_fila;
CREATE POLICY notif_wa_update_equipe ON public.notificacao_whatsapp_fila
  FOR UPDATE TO authenticated
  USING (public.is_equipe())
  WITH CHECK (public.is_equipe());

-- ---------------------------------------------------------------------------
-- 3. O trigger que enfileira
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_demanda_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento text;
  v_antes  text;
  v_nome   text;
  v_email  text;
  v_prefs  public.notificacao_preferencias%ROWTYPE;
BEGIN
  -- Demanda na lixeira nao gera aviso.
  IF NEW.deleted_at IS NOT NULL OR NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- O recibo. E tambem a primeira prova de que o numero informado funciona.
    v_evento := 'demanda_criada';
  ELSE
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;
    -- Quem mexeu na propria demanda ja sabe o que fez.
    IF auth.uid() IS NOT DISTINCT FROM NEW.created_by THEN
      RETURN NEW;
    END IF;
    v_antes  := OLD.status::text;
    v_evento := CASE WHEN NEW.status = 'concluido'
                     THEN 'demanda_concluida' ELSE 'coluna_mudou' END;
  END IF;

  -- Opt-in: sem linha de preferencia, sem aceite ou sem numero, nao manda.
  SELECT * INTO v_prefs
  FROM public.notificacao_preferencias
  WHERE user_id = NEW.created_by;

  IF NOT FOUND OR NOT v_prefs.whatsapp_ativo OR v_prefs.whatsapp_telefone IS NULL THEN
    RETURN NEW;
  END IF;

  -- Mesmo destino em 10 minutos: cartao arrastado para a coluna errada e
  -- devolvido. Nao esconde movimento de verdade, esconde o vai-e-volta.
  IF EXISTS (
    SELECT 1 FROM public.notificacao_whatsapp_fila f
    WHERE f.demanda_id = NEW.id
      AND f.dados->>'status' = NEW.status::text
      AND f.created_at > now() - interval '10 minutes'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT p.email, p.nome INTO v_email, v_nome
  FROM public.profiles p
  WHERE p.id = NEW.created_by;

  INSERT INTO public.notificacao_whatsapp_fila
    (destinatario_id, telefone, demanda_id, evento, dados)
  VALUES (
    NEW.created_by,
    v_prefs.whatsapp_telefone,
    NEW.id,
    v_evento,
    jsonb_build_object(
      'ticket_code',  NEW.ticket_code,
      'titulo',       NEW.title,
      'nome',         split_part(
                        COALESCE(NULLIF(btrim(v_nome), ''),
                                 split_part(COALESCE(v_email, ''), '@', 1)),
                        ' ', 1),
      'status',       NEW.status::text,
      'status_antes', v_antes
    )
  );

  RETURN NEW;

-- Aviso nunca pode impedir o trabalho. Se qualquer coisa acima falhar, o
-- cartao se move do mesmo jeito e o problema vira um WARNING no log do banco,
-- em vez de um "erro ao mover a demanda" na tela de alguem.
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_demanda_whatsapp: aviso nao enfileirado para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_demanda_whatsapp ON public.demands;
CREATE TRIGGER trg_demanda_whatsapp
  AFTER INSERT OR UPDATE OF status ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.trg_demanda_whatsapp();

-- ---------------------------------------------------------------------------
-- 4. O cron — rodado à mão, uma vez
-- ---------------------------------------------------------------------------
-- Criado em 2026-09-25 (job 3), no SQL Editor do projeto cgbhpenkytibgiosksrb,
-- depois dos secrets UAZAPI_URL e UAZAPI_TOKEN.
--
-- COM A CHAVE PÚBLICA (anon), NÃO COM A SERVICE ROLE. O email usa a service
-- role no header, e por isso o cron dele não pode ser versionado. Esta função
-- só exige um JWT válido do projeto (verify_jwt = true) e acessa o banco com a
-- credencial dela mesma; a anon é JWT válido, já é pública (está no bundle do
-- site) e não dá a quem a tem nada além de "processe a fila agora". Resultado:
-- nenhum segredo gravado em cron.job.
--
--   select cron.schedule(
--     'notificacao-whatsapp-fila',
--     '* * * * *',
--     $cron$
--       select net.http_post(
--         url := 'https://cgbhpenkytibgiosksrb.supabase.co/functions/v1/notificacao-whatsapp-fila',
--         headers := jsonb_build_object(
--           'Content-Type','application/json',
--           'Authorization','Bearer <ANON_KEY — a de src/integrations/supabase/client.ts>'
--         ),
--         body := '{}'::jsonb
--       );
--     $cron$
--   );
--
-- Para conferir:  select * from cron.job where jobname = 'notificacao-whatsapp-fila';
-- A resposta da função a cada minuto (processados, enviados, falhas...):
--   select created, status_code, content from net._http_response
--   order by created desc limit 5;
-- Para desligar:  select cron.unschedule('notificacao-whatsapp-fila');
-- Para ver o que ficou em dúvida:
--   select id, telefone, evento, ultimo_erro, reservado_em
--   from notificacao_whatsapp_fila where situacao = 'incerto'
--   order by reservado_em desc;
