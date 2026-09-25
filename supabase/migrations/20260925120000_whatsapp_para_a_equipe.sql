-- O Blink também avisa a equipe — e avisa quando alguém responde no chat
--
-- Continua 20260924120000_notificacao_por_whatsapp.sql. Mesma fila, mesma edge
-- function, mesmo opt-in: só recebe quem ativou o WhatsApp em Preferências.
-- Dois avisos novos:
--
-- 1. DEMANDA NOVA SEM RESPONSÁVEL → para a equipe.
--    Tudo que chega pelo portal nasce sem responsável, e até aqui nenhum aviso
--    ia para ninguém: `trg_demand_notify` só avisa quando existe um
--    `assigned_to`. A equipe só descobria a demanda abrindo o quadro.
--    "Equipe" é a mesma definição de `is_equipe()`: papel `developer` ou
--    `administrador` em `allowed_emails`. Quem abriu a demanda não recebe o
--    próprio aviso, mesmo sendo da equipe.
--
-- 2. MENSAGEM NO CHAT → para quem o sistema já avisaria no sininho.
--    `trg_demand_comment_notify` já decide quem recebe cada mensagem do chat:
--    quem abriu, o responsável e quem já comentou, menos o autor. Em vez de
--    copiar essa regra, este trigger fica em cima de `notifications`: todo
--    aviso `new_comment` que o sistema grava, para quem ativou o WhatsApp,
--    também vai para o celular. A regra de quem recebe continua morando num
--    lugar só.
--
--    Com duas proteções a mais que o sininho não tem:
--      • NOTA INTERNA SÓ PARA A EQUIPE. O sininho esconde a nota interna só de
--        quem abriu a demanda; um outro solicitante que tenha comentado nela
--        recebe o trecho da nota. Aqui a nota só vai para quem é da equipe.
--      • RESPOSTA DO BLINK NÃO GERA WHATSAPP. O agente automático responde no
--        chat logo depois que a demanda é criada (`is_ai`). Mandar "o Blink
--        escreveu no chat" pelo próprio Blink seria ruído.
--
--    Por que o comentário é achado por horário: o aviso do sininho não guarda
--    o id do comentário. Mas os dois são gravados na mesma transação, e
--    `created_at` dos dois é `now()` — o mesmo instante. O comentário mais
--    recente com `created_at <= aviso.created_at` é o que gerou o aviso;
--    comentários posteriores vêm de transações posteriores, com `now()` maior.
--
-- NADA AQUI PODE IMPEDIR O TRABALHO. Os dois triggers têm EXCEPTION WHEN
-- OTHERS: se enfileirar falhar, a demanda é criada e a mensagem é postada do
-- mesmo jeito, e o problema vira WARNING no log.
--
-- SEM LITERAL ACENTUADO, pelo mesmo motivo da migration anterior: o SQL Editor
-- do Supabase corrompe acento colado. Os textos com acento moram na edge
-- function.

-- ---------------------------------------------------------------------------
-- 1. Os eventos novos na fila
-- ---------------------------------------------------------------------------

ALTER TABLE public.notificacao_whatsapp_fila
  DROP CONSTRAINT IF EXISTS notif_wa_evento_valido;
ALTER TABLE public.notificacao_whatsapp_fila
  ADD CONSTRAINT notif_wa_evento_valido
  CHECK (evento IN (
    'demanda_criada', 'coluna_mudou', 'demanda_concluida',
    'dev_demanda_nova', 'mensagem_chat'
  ));

-- ---------------------------------------------------------------------------
-- 2. Quem é da equipe, para qualquer usuário (is_equipe() só olha auth.uid())
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.eh_da_equipe(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_emails ae
    JOIN auth.users u ON lower(u.email) = ae.email
    WHERE u.id = _user_id
      AND ae.role IN ('developer', 'administrador')
  );
$$;

-- Só os triggers usam. Liberar para `authenticated` deixaria qualquer usuário
-- descobrir o papel de qualquer outro.
REVOKE ALL ON FUNCTION public.eh_da_equipe(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Demanda nova sem responsável → equipe
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_demanda_whatsapp_equipe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitante text;
  v_sol_email   text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.nome, p.email INTO v_solicitante, v_sol_email
  FROM public.profiles p WHERE p.id = NEW.created_by;

  INSERT INTO public.notificacao_whatsapp_fila
    (destinatario_id, telefone, demanda_id, evento, dados)
  SELECT
    pref.user_id,
    pref.whatsapp_telefone,
    NEW.id,
    'dev_demanda_nova',
    -- Sem a chave 'status', de proposito: o filtro de repeticao do aviso ao
    -- solicitante compara dados->>'status', e esta linha nao pode segurar
    -- um aviso dele.
    jsonb_build_object(
      'ticket_code', NEW.ticket_code,
      'titulo',      NEW.title,
      'nome',        split_part(
                       COALESCE(NULLIF(btrim(prof.nome), ''),
                                split_part(COALESCE(prof.email, ''), '@', 1)),
                       ' ', 1),
      'solicitante', split_part(
                       COALESCE(NULLIF(btrim(v_solicitante), ''),
                                split_part(COALESCE(v_sol_email, ''), '@', 1)),
                       ' ', 1),
      'prioridade',  NEW.priority::text,
      'descricao',   left(COALESCE(NEW.description, ''), 400)
    )
  FROM public.notificacao_preferencias pref
  JOIN auth.users u          ON u.id = pref.user_id
  JOIN public.allowed_emails ae ON ae.email = lower(u.email)
  LEFT JOIN public.profiles prof ON prof.id = pref.user_id
  WHERE pref.whatsapp_ativo
    AND pref.whatsapp_telefone IS NOT NULL
    AND ae.role IN ('developer', 'administrador')
    AND pref.user_id IS DISTINCT FROM NEW.created_by;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_demanda_whatsapp_equipe: aviso nao enfileirado para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_demanda_whatsapp_equipe ON public.demands;
CREATE TRIGGER trg_demanda_whatsapp_equipe
  AFTER INSERT ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.trg_demanda_whatsapp_equipe();

-- ---------------------------------------------------------------------------
-- 4. Mensagem no chat → quem o sininho avisaria
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_notificacao_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demanda uuid;
  v_dem     public.demands%ROWTYPE;
  v_com     public.demand_comments%ROWTYPE;
  v_prefs   public.notificacao_preferencias%ROWTYPE;
  v_nome    text;
  v_email   text;
  v_autor   text;
BEGIN
  IF NEW.type IS DISTINCT FROM 'new_comment' OR NEW.link_url IS NULL THEN
    RETURN NEW;
  END IF;

  -- So '/demandas/<uuid>'. O mesmo trigger do sininho atende comentario de
  -- cartao de projeto, com link no mesmo formato: por isso a checagem abaixo
  -- de que o id e de uma demanda.
  IF NEW.link_url !~ '^/demandas/[0-9a-fA-F-]{36}$' THEN
    RETURN NEW;
  END IF;
  v_demanda := substring(NEW.link_url FROM 11)::uuid;

  SELECT * INTO v_dem FROM public.demands
  WHERE id = v_demanda AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_prefs FROM public.notificacao_preferencias
  WHERE user_id = NEW.user_id;
  IF NOT FOUND OR NOT v_prefs.whatsapp_ativo OR v_prefs.whatsapp_telefone IS NULL THEN
    RETURN NEW;
  END IF;

  -- O comentario que gerou este aviso: mesma transacao, mesmo now().
  SELECT * INTO v_com FROM public.demand_comments c
  WHERE c.demand_id = v_demanda
    AND c.created_at <= NEW.created_at
    AND NOT COALESCE(c.is_system, false)
  ORDER BY c.created_at DESC
  LIMIT 1;
  IF NOT FOUND OR COALESCE(v_com.is_ai, false) THEN
    RETURN NEW;
  END IF;

  -- Nota interna: so para a equipe, e nunca para quem abriu a demanda.
  IF COALESCE(v_com.is_internal, false)
     AND (NEW.user_id = v_dem.created_by OR NOT public.eh_da_equipe(NEW.user_id)) THEN
    RETURN NEW;
  END IF;

  SELECT p.nome, p.email INTO v_nome, v_email FROM public.profiles p WHERE p.id = NEW.user_id;
  SELECT p.nome INTO v_autor FROM public.profiles p WHERE p.id = v_com.user_id;

  INSERT INTO public.notificacao_whatsapp_fila
    (destinatario_id, telefone, demanda_id, evento, dados)
  VALUES (
    NEW.user_id,
    v_prefs.whatsapp_telefone,
    v_demanda,
    'mensagem_chat',
    jsonb_build_object(
      'ticket_code', v_dem.ticket_code,
      'titulo',      v_dem.title,
      'nome',        split_part(
                       COALESCE(NULLIF(btrim(v_nome), ''),
                                split_part(COALESCE(v_email, ''), '@', 1)),
                       ' ', 1),
      'autor',       split_part(COALESCE(btrim(v_autor), ''), ' ', 1),
      'trecho',      left(COALESCE(v_com.content, ''), 600),
      'interno',     COALESCE(v_com.is_internal, false),
      -- 'dono' = quem abriu a demanda. Muda o texto: "sua solicitacao".
      'papel',       CASE WHEN NEW.user_id = v_dem.created_by THEN 'dono' ELSE 'participante' END
    )
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notificacao_whatsapp: aviso nao enfileirado (%): %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificacao_whatsapp ON public.notifications;
CREATE TRIGGER trg_notificacao_whatsapp
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_notificacao_whatsapp();
