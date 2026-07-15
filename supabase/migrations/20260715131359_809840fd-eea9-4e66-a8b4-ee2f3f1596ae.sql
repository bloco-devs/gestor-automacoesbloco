DO $$
DECLARE
  ids uuid[] := ARRAY[
    '60e73a3a-5d9f-4747-8a4e-5cf1b9e4e6f9'::uuid,
    '7c7b36f8-7958-408c-9777-096f3dfa1ebd'::uuid,
    'b6cf6f95-586d-40e1-b6a1-4d6184b82ca8'::uuid
  ];
BEGIN
  DELETE FROM public.atividades_card_labels
    WHERE card_id IN (SELECT id FROM public.atividades_cards WHERE board_id = ANY(ids));
  DELETE FROM public.atividades_cards WHERE board_id = ANY(ids);
  DELETE FROM public.atividades_colunas WHERE board_id = ANY(ids);
  DELETE FROM public.atividades_labels WHERE board_id = ANY(ids);
  UPDATE public.atividades_import_jobs SET board_id_local = NULL WHERE board_id_local = ANY(ids);
  DELETE FROM public.atividades_board_membros WHERE board_id = ANY(ids);
  DELETE FROM public.atividades_boards WHERE id = ANY(ids);
END $$;