-- Q3.6 Bloco 5: espelhar eventos de card em board_historico
CREATE OR REPLACE FUNCTION public.sync_card_events_to_board_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board uuid;
  v_evento text;
BEGIN
  -- Só espelha eventos relevantes vindos de cards
  IF NEW.entity IS DISTINCT FROM 'card' AND NEW.entity IS DISTINCT FROM 'anexo' THEN
    RETURN NEW;
  END IF;

  SELECT board_id INTO v_board FROM public.atividades_cards WHERE id = NEW.card_id;
  IF v_board IS NULL THEN
    RETURN NEW;
  END IF;

  v_evento := CASE NEW.tipo
    WHEN 'movido'            THEN 'card_movido'
    WHEN 'renomeado'         THEN 'card_renomeado'
    WHEN 'prazo'             THEN 'card_prazo_alterado'
    WHEN 'concluido'         THEN 'card_concluido'
    WHEN 'reaberto'          THEN 'card_reaberto'
    WHEN 'criado'            THEN 'card_criado'
    WHEN 'anexo_adicionado'  THEN 'card_anexo_adicionado'
    WHEN 'anexo_removido'    THEN 'card_anexo_removido'
    ELSE NULL
  END;

  IF v_evento IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.atividades_board_historico (board_id, user_id, evento, payload)
  VALUES (
    v_board,
    NEW.user_id,
    v_evento,
    COALESCE(NEW.payload, '{}'::jsonb) || jsonb_build_object('card_id', NEW.card_id)
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_card_events_to_board_historico ON public.atividades_atividade_log;
CREATE TRIGGER trg_sync_card_events_to_board_historico
AFTER INSERT ON public.atividades_atividade_log
FOR EACH ROW EXECUTE FUNCTION public.sync_card_events_to_board_historico();
