-- Avisos de nova mensagem no fio da demanda -------------------------------
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
        AND (NOT v_interno OR x IS DISTINCT FROM v_criador)
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

  -- atividades_comentarios (cartões de quadro)
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
              COALESCE(NULLIF(btrim(v_titulo), ''), 'Cartão') || ': ' || v_trecho,
              'new_comment', v_link);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demand_comments_notify ON public.demand_comments;
CREATE TRIGGER demand_comments_notify
AFTER INSERT ON public.demand_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_demand_comment_notify();

DROP TRIGGER IF EXISTS atividades_comentarios_notify ON public.atividades_comentarios;
CREATE TRIGGER atividades_comentarios_notify
AFTER INSERT ON public.atividades_comentarios
FOR EACH ROW EXECUTE FUNCTION public.trg_demand_comment_notify();