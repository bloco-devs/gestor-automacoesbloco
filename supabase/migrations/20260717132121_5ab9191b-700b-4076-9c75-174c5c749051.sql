CREATE OR REPLACE FUNCTION public.atividades_board_set_background(
  _board_id uuid,
  _background text,
  _cover_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_old record;
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT background, cover_url INTO v_old
    FROM public.atividades_boards WHERE id = _board_id;
  UPDATE public.atividades_boards
     SET background = _background,
         cover_url  = _cover_url,
         updated_at = now()
   WHERE id = _board_id;
  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (_board_id, auth.uid(), 'board_fundo_alterado',
    jsonb_strip_nulls(jsonb_build_object(
      'background_de', v_old.background, 'background_para', _background,
      'cover_de', v_old.cover_url,       'cover_para', _cover_url
    )));
END;
$$;

GRANT EXECUTE ON FUNCTION public.atividades_board_set_background(uuid, text, text) TO authenticated;