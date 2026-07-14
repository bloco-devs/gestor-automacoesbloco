CREATE OR REPLACE FUNCTION public.atividades_create_board(
  _nome text,
  _descricao text DEFAULT NULL,
  _visibilidade text DEFAULT 'workspace',
  _cor text DEFAULT NULL,
  _icone text DEFAULT NULL,
  _background text DEFAULT NULL,
  _workspace_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ws  uuid;
  v_id  uuid;
  v_slug text;
  v_key_suffix text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;
  IF NOT public.is_allowed_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _visibilidade NOT IN ('private','workspace','public') THEN
    RAISE EXCEPTION 'invalid visibilidade' USING ERRCODE='22023';
  END IF;

  v_ws := COALESCE(_workspace_id, (SELECT id FROM public.atividades_workspaces WHERE slug='grupo-bloco'));

  v_slug := lower(regexp_replace(coalesce(_nome,'quadro'), '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.atividades_boards (slug, nome, descricao, cor, icone, background, visibilidade, workspace_id, criado_por, ordem)
  VALUES (v_slug, _nome, _descricao, _cor, _icone, _background, _visibilidade, v_ws, v_uid,
          COALESCE((SELECT max(ordem)+1 FROM public.atividades_boards), 0))
  RETURNING id INTO v_id;

  INSERT INTO public.atividades_board_membros (board_id, user_id, role, convidado_por)
  VALUES (v_id, v_uid, 'owner', v_uid)
  ON CONFLICT (board_id, user_id) DO NOTHING;

  -- A tabela atividades_colunas possui chave única global herdada.
  -- Portanto as colunas padrão precisam ter chave única por board criado,
  -- preservando os prefixos semânticos usados pelo app.
  v_key_suffix := substr(v_id::text, 1, 8);

  INSERT INTO public.atividades_colunas (board_id, chave, nome, ordem) VALUES
    (v_id, 'backlog-'      || v_key_suffix, 'Backlog',       0),
    (v_id, 'a-fazer-'      || v_key_suffix, 'A Fazer',       1),
    (v_id, 'em-andamento-' || v_key_suffix, 'Em Andamento',  2),
    (v_id, 'em-revisao-'   || v_key_suffix, 'Em Revisão',    3),
    (v_id, 'concluido-'    || v_key_suffix, 'Concluído',     4);

  INSERT INTO public.atividades_board_historico (board_id, user_id, evento, payload)
  VALUES (v_id, v_uid, 'board_criado', jsonb_build_object('nome', _nome));

  RETURN v_id;
END;
$$;