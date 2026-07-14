REVOKE EXECUTE ON FUNCTION public.atividades_create_board(text,text,text,text,text,text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atividades_create_board(text,text,text,text,text,text,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.atividades_create_board(text,text,text,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atividades_create_board(text,text,text,text,text,text,uuid) TO service_role;