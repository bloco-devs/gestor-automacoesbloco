CREATE OR REPLACE FUNCTION public.atividades_board_delete(_board_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  -- Apagar dependências em ordem (FKs RESTRICT do board para colunas/cards/labels/anexos)
  DELETE FROM public.atividades_anexos WHERE board_id = _board_id;
  DELETE FROM public.atividades_cards WHERE board_id = _board_id;
  DELETE FROM public.atividades_colunas WHERE board_id = _board_id;
  DELETE FROM public.atividades_labels WHERE board_id = _board_id;
  -- Import entities apontam para board via board_id_local (SET NULL) — limpar entities do job
  UPDATE public.atividades_import_jobs SET board_id_local = NULL WHERE board_id_local = _board_id;
  DELETE FROM public.atividades_boards WHERE id = _board_id;
END $$;