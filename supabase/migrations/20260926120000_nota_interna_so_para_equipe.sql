-- Nota interna vazava para solicitante que não era o dono da demanda
--
-- O TRIGGER `trg_demand_comment_notify()` (20260811142611) monta o conjunto de
-- destinatários com QUALQUER pessoa que já comentou na demanda, e o filtro de
-- nota interna excluía só quem ABRIU a demanda:
--
--   AND (NOT v_interno OR x IS DISTINCT FROM v_criador)
--
-- Um segundo solicitante que comenta na mesma demanda — um colega do dono, ou
-- alguém que a equipe adicionou à conversa — não é `v_criador`. Ele passava
-- pelo filtro e recebia, no sininho, o trecho de toda nota interna que a
-- equipe escrevesse ali. Nota interna existe para não ser vista por quem
-- pediu; o vazamento vale para qualquer solicitante, não só o dono.
--
-- Achado ao construir o aviso por WhatsApp: lá a mesma regra já nasceu
-- correta (`trg_notificacao_whatsapp`, 20260925120000), usando
-- `eh_da_equipe()`. Este migration aplica a mesma correção aqui, na origem —
-- o sininho — de onde o WhatsApp lê o aviso.
--
-- A CORREÇÃO: nota interna só vai para quem É DA EQUIPE, e continua nunca indo
-- para quem abriu a demanda (mantido por segurança, ainda que redundante: um
-- solicitante não tem papel de equipe).
--
-- O ramo de `atividades_comentarios` (cartões de quadro) não muda: essa
-- tabela não tem coluna `is_internal`, não existe nota interna ali.
--
-- Sem literal acentuado no corpo da função: aplicada pelo SQL Editor do
-- Supabase, que corrompe acento colado.

CREATE OR REPLACE FUNCTION public.trg_demand_comment_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link     text;
  v_titulo   text;
  v_trecho   text;
  v_autor    uuid;
  v_dest     uuid;
  v_criador  uuid;
  v_interno  boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'demand_comments' THEN
    IF COALESCE(NEW.is_system, false) THEN
      RETURN NEW;
    END IF;
    v_interno := COALESCE(NEW.is_internal, false);
    v_autor   := NEW.user_id;
    v_link    := '/demandas/' || NEW.demand_id::text;
    v_trecho  := left(COALESCE(NEW.content, ''), 120);

    SELECT d.title, d.created_by INTO v_titulo, v_criador
    FROM public.demands d WHERE d.id = NEW.demand_id;

    FOR v_dest IN
      SELECT DISTINCT x FROM (
        SELECT d.created_by AS x FROM public.demands d WHERE d.id = NEW.demand_id
        UNION
        SELECT d.assigned_to FROM public.demands d WHERE d.id = NEW.demand_id
        UNION
        SELECT c.user_id FROM public.demand_comments c WHERE c.demand_id = NEW.demand_id
      ) s
      WHERE x IS NOT NULL
        AND x IS DISTINCT FROM v_autor
        AND x IS DISTINCT FROM auth.uid()
        -- nota interna: so quem e da equipe, e nunca quem abriu a demanda
        AND (NOT v_interno OR (public.eh_da_equipe(x) AND x IS DISTINCT FROM v_criador))
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = v_dest
          AND n.link_url = v_link
          AND n.type = 'new_comment'
          AND n.created_at > now() - interval '10 minutes'
      ) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link_url)
        VALUES (v_dest,
                'Nova mensagem na demanda',
                COALESCE(NULLIF(btrim(v_titulo), ''), 'Demanda') || ': ' || v_trecho,
                'new_comment', v_link);
      END IF;
    END LOOP;

    RETURN NEW;
  END IF;

  -- atividades_comentarios (cartoes de quadro): sem is_internal, sem mudanca.
  v_autor  := NEW.user_id;
  v_link   := '/demandas/' || NEW.card_id::text;
  v_trecho := left(COALESCE(NEW.texto, ''), 120);

  SELECT c.titulo INTO v_titulo FROM public.atividades_cards c WHERE c.id = NEW.card_id;

  FOR v_dest IN
    SELECT DISTINCT x FROM (
      SELECT c.created_by AS x FROM public.atividades_cards c WHERE c.id = NEW.card_id
      UNION
      SELECT unnest(c.responsavel_ids)::uuid FROM public.atividades_cards c WHERE c.id = NEW.card_id
      UNION
      SELECT m.user_id FROM public.atividades_card_membros m WHERE m.card_id = NEW.card_id
      UNION
      SELECT a.user_id FROM public.atividades_comentarios a WHERE a.card_id = NEW.card_id
    ) s
    WHERE x IS NOT NULL
      AND x IS DISTINCT FROM v_autor
      AND x IS DISTINCT FROM auth.uid()
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = v_dest
        AND n.link_url = v_link
        AND n.type = 'new_comment'
        AND n.created_at > now() - interval '10 minutes'
    ) THEN
      INSERT INTO public.notifications (user_id, title, message, type, link_url)
      VALUES (v_dest,
              'Nova mensagem na demanda',
              COALESCE(NULLIF(btrim(v_titulo), ''), U&'Cart\00E3o') || ': ' || v_trecho,
              'new_comment', v_link);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- A funcao ja existe (20260811142611); so redefine o corpo. Os dois triggers
-- que a chamam continuam os mesmos, sem precisar recriar.
