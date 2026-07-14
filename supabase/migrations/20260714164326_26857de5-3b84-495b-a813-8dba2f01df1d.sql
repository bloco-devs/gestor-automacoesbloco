
ALTER TABLE public.atividades_colunas
  ADD COLUMN IF NOT EXISTS wip_limit int;

ALTER TABLE public.atividades_labels
  ADD COLUMN IF NOT EXISTS favorita boolean NOT NULL DEFAULT false;

-- Definir limite de WIP
CREATE OR REPLACE FUNCTION public.atividades_coluna_set_wip(_coluna_id uuid, _wip int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_board uuid;
BEGIN
  SELECT board_id INTO v_board FROM public.atividades_colunas WHERE id = _coluna_id;
  IF v_board IS NULL THEN RETURN; END IF;
  IF NOT public.atividades_can_admin_board(v_board) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _wip IS NOT NULL AND _wip < 0 THEN
    RAISE EXCEPTION 'wip deve ser >= 0' USING ERRCODE = '22023';
  END IF;
  UPDATE public.atividades_colunas
     SET wip_limit = CASE WHEN _wip IS NULL OR _wip = 0 THEN NULL ELSE _wip END,
         updated_at = now()
   WHERE id = _coluna_id;
  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (v_board, auth.uid(), 'coluna_wip_alterado',
          jsonb_build_object('coluna_id', _coluna_id, 'wip', _wip));
END $$;

-- Favorita em etiqueta
CREATE OR REPLACE FUNCTION public.atividades_label_set_favorita(_label_id uuid, _fav boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_board uuid;
BEGIN
  SELECT board_id INTO v_board FROM public.atividades_labels WHERE id = _label_id;
  IF v_board IS NULL THEN RETURN; END IF;
  IF NOT public.atividades_can_admin_board(v_board) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.atividades_labels
     SET favorita = _fav, updated_at = now()
   WHERE id = _label_id;
END $$;

-- Reordenar etiquetas
CREATE OR REPLACE FUNCTION public.atividades_label_reorder(_board_id uuid, _items jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a jsonb array' USING ERRCODE = '22023';
  END IF;
  FOR r IN SELECT * FROM jsonb_to_recordset(_items) AS x(id uuid, ordem int) LOOP
    UPDATE public.atividades_labels
       SET ordem = r.ordem, updated_at = now()
     WHERE id = r.id AND board_id = _board_id;
  END LOOP;
END $$;
