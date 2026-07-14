-- =========================================================
-- Onda Q3 — Configurações de Quadros (ADITIVO)
-- =========================================================

-- 1) Novo papel 'observer' no enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid=e.enumtypid
    WHERE t.typname='atividades_board_role' AND e.enumlabel='observer'
  ) THEN
    ALTER TYPE public.atividades_board_role ADD VALUE 'observer';
  END IF;
END$$;

-- 2) Colunas: campos de arquivamento + índice
ALTER TABLE public.atividades_colunas
  ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivada_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_atividades_colunas_board_arquivada
  ON public.atividades_colunas(board_id, arquivada, ordem);

-- 3) Boards: cover_url (estrutura preparada; background já existe)
ALTER TABLE public.atividades_boards
  ADD COLUMN IF NOT EXISTS cover_url text;

-- 4) RLS aditivas para atividades_colunas (mutações board-scope)
DROP POLICY IF EXISTS "colunas_admin_write_board" ON public.atividades_colunas;
CREATE POLICY "colunas_admin_write_board"
  ON public.atividades_colunas
  FOR ALL
  USING (public.atividades_can_admin_board(board_id))
  WITH CHECK (public.atividades_can_admin_board(board_id));

-- 5) RLS aditivas para atividades_labels (mutações board-scope)
DROP POLICY IF EXISTS "labels_admin_write_board" ON public.atividades_labels;
CREATE POLICY "labels_admin_write_board"
  ON public.atividades_labels
  FOR ALL
  USING (public.atividades_can_admin_board(board_id))
  WITH CHECK (public.atividades_can_admin_board(board_id));

-- 6) DELETE de boards (admin do board)
DROP POLICY IF EXISTS "boards_delete_admins" ON public.atividades_boards;
CREATE POLICY "boards_delete_admins"
  ON public.atividades_boards
  FOR DELETE
  USING (public.atividades_can_admin_board(id));

-- =========================================================
-- RPCs
-- =========================================================

-- Atualizar dados do board
CREATE OR REPLACE FUNCTION public.atividades_board_update(
  _board_id uuid,
  _nome text DEFAULT NULL,
  _descricao text DEFAULT NULL,
  _cor text DEFAULT NULL,
  _icone text DEFAULT NULL,
  _background text DEFAULT NULL,
  _cover_url text DEFAULT NULL,
  _visibilidade text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _visibilidade IS NOT NULL AND _visibilidade NOT IN ('private','workspace','public') THEN
    RAISE EXCEPTION 'invalid visibilidade' USING ERRCODE='22023';
  END IF;

  SELECT nome, descricao, cor, icone, background, cover_url, visibilidade
    INTO v_old FROM public.atividades_boards WHERE id = _board_id;

  UPDATE public.atividades_boards SET
    nome         = COALESCE(_nome, nome),
    descricao    = COALESCE(_descricao, descricao),
    cor          = COALESCE(_cor, cor),
    icone        = COALESCE(_icone, icone),
    background   = COALESCE(_background, background),
    cover_url    = COALESCE(_cover_url, cover_url),
    visibilidade = COALESCE(_visibilidade, visibilidade),
    updated_at   = now()
  WHERE id = _board_id;

  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (_board_id, auth.uid(), 'board_atualizado',
    jsonb_strip_nulls(jsonb_build_object(
      'nome_de', CASE WHEN _nome IS NOT NULL AND _nome IS DISTINCT FROM v_old.nome THEN v_old.nome END,
      'nome_para', CASE WHEN _nome IS NOT NULL AND _nome IS DISTINCT FROM v_old.nome THEN _nome END,
      'visibilidade_de', CASE WHEN _visibilidade IS NOT NULL AND _visibilidade IS DISTINCT FROM v_old.visibilidade THEN v_old.visibilidade END,
      'visibilidade_para', CASE WHEN _visibilidade IS NOT NULL AND _visibilidade IS DISTINCT FROM v_old.visibilidade THEN _visibilidade END,
      'cor_de', CASE WHEN _cor IS NOT NULL AND _cor IS DISTINCT FROM v_old.cor THEN v_old.cor END,
      'cor_para', CASE WHEN _cor IS NOT NULL AND _cor IS DISTINCT FROM v_old.cor THEN _cor END
    )));
END $$;

-- Excluir board
CREATE OR REPLACE FUNCTION public.atividades_board_delete(_board_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  DELETE FROM public.atividades_boards WHERE id = _board_id;
END $$;

-- Colunas: create
CREATE OR REPLACE FUNCTION public.atividades_coluna_create(
  _board_id uuid,
  _nome text,
  _chave text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_ord int;
  v_chave text;
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(MAX(ordem),-1)+1 INTO v_ord
    FROM public.atividades_colunas WHERE board_id = _board_id;
  v_chave := COALESCE(NULLIF(_chave,''),
    lower(regexp_replace(_nome, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6));
  INSERT INTO public.atividades_colunas(board_id, nome, chave, ordem)
  VALUES (_board_id, _nome, v_chave, v_ord)
  RETURNING id INTO v_id;

  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (_board_id, auth.uid(), 'coluna_criada',
    jsonb_build_object('coluna_id', v_id, 'nome', _nome));
  RETURN v_id;
END $$;

-- Colunas: update
CREATE OR REPLACE FUNCTION public.atividades_coluna_update(
  _coluna_id uuid,
  _nome text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_board uuid; v_old text;
BEGIN
  SELECT board_id, nome INTO v_board, v_old
    FROM public.atividades_colunas WHERE id = _coluna_id;
  IF v_board IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE='P0002';
  END IF;
  IF NOT public.atividades_can_admin_board(v_board) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.atividades_colunas SET
    nome = COALESCE(_nome, nome),
    updated_at = now()
  WHERE id = _coluna_id;

  IF _nome IS NOT NULL AND _nome IS DISTINCT FROM v_old THEN
    INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
    VALUES (v_board, auth.uid(), 'coluna_renomeada',
      jsonb_build_object('coluna_id', _coluna_id, 'de', v_old, 'para', _nome));
  END IF;
END $$;

-- Colunas: delete
CREATE OR REPLACE FUNCTION public.atividades_coluna_delete(_coluna_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_board uuid; v_nome text; v_count int;
BEGIN
  SELECT board_id, nome INTO v_board, v_nome
    FROM public.atividades_colunas WHERE id = _coluna_id;
  IF v_board IS NULL THEN RETURN; END IF;
  IF NOT public.atividades_can_admin_board(v_board) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT count(*) INTO v_count FROM public.atividades_cards WHERE coluna_id = _coluna_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'coluna_nao_vazia' USING ERRCODE='23503',
      MESSAGE = 'A coluna possui cards. Mova-os antes de excluir.';
  END IF;
  DELETE FROM public.atividades_colunas WHERE id = _coluna_id;
  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (v_board, auth.uid(), 'coluna_excluida',
    jsonb_build_object('coluna_id', _coluna_id, 'nome', v_nome));
END $$;

-- Colunas: set arquivada
CREATE OR REPLACE FUNCTION public.atividades_coluna_set_arquivada(
  _coluna_id uuid, _arquivada boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_board uuid;
BEGIN
  SELECT board_id INTO v_board
    FROM public.atividades_colunas WHERE id = _coluna_id;
  IF v_board IS NULL THEN RETURN; END IF;
  IF NOT public.atividades_can_admin_board(v_board) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.atividades_colunas SET
    arquivada = _arquivada,
    arquivada_em = CASE WHEN _arquivada THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = _coluna_id;
  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (v_board, auth.uid(),
    CASE WHEN _arquivada THEN 'coluna_arquivada' ELSE 'coluna_restaurada' END,
    jsonb_build_object('coluna_id', _coluna_id));
END $$;

-- Colunas: reorder (troca a ordem de várias)
CREATE OR REPLACE FUNCTION public.atividades_coluna_reorder(_board_id uuid, _items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a jsonb array' USING ERRCODE='22023';
  END IF;
  FOR r IN SELECT * FROM jsonb_to_recordset(_items) AS x(id uuid, ordem int) LOOP
    UPDATE public.atividades_colunas
       SET ordem = r.ordem, updated_at = now()
     WHERE id = r.id AND board_id = _board_id;
  END LOOP;
  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (_board_id, auth.uid(), 'colunas_reordenadas', '{}'::jsonb);
END $$;

-- Colunas: duplicar (sem cards)
CREATE OR REPLACE FUNCTION public.atividades_coluna_duplicate(_coluna_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_board uuid; v_nome text; v_id uuid;
BEGIN
  SELECT board_id, nome INTO v_board, v_nome
    FROM public.atividades_colunas WHERE id = _coluna_id;
  IF v_board IS NULL THEN RETURN NULL; END IF;
  v_id := public.atividades_coluna_create(v_board, v_nome || ' (cópia)', NULL);
  RETURN v_id;
END $$;

-- Alterar papel de membro
CREATE OR REPLACE FUNCTION public.atividades_board_set_member_role(
  _board_id uuid, _user_id uuid, _role atividades_board_role
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old atividades_board_role;
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT role INTO v_old FROM public.atividades_board_membros
    WHERE board_id = _board_id AND user_id = _user_id;
  UPDATE public.atividades_board_membros
    SET role = _role, updated_at = now()
    WHERE board_id = _board_id AND user_id = _user_id;
  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (_board_id, auth.uid(), 'membro_papel_alterado',
    jsonb_build_object('user_id', _user_id, 'de', v_old, 'para', _role));
END $$;

-- Etiquetas: create/update/delete via RPC com histórico
CREATE OR REPLACE FUNCTION public.atividades_label_upsert(
  _board_id uuid, _id uuid, _nome text, _cor text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _id IS NULL THEN
    INSERT INTO public.atividades_labels(board_id, nome, cor)
    VALUES (_board_id, _nome, _cor)
    RETURNING id INTO v_id;
    INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
    VALUES (_board_id, auth.uid(), 'etiqueta_criada',
      jsonb_build_object('label_id', v_id, 'nome', _nome, 'cor', _cor));
  ELSE
    UPDATE public.atividades_labels
      SET nome = _nome, cor = _cor, updated_at = now()
      WHERE id = _id AND board_id = _board_id;
    v_id := _id;
    INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
    VALUES (_board_id, auth.uid(), 'etiqueta_atualizada',
      jsonb_build_object('label_id', v_id, 'nome', _nome, 'cor', _cor));
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.atividades_label_delete(_label_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_board uuid; v_nome text;
BEGIN
  SELECT board_id, nome INTO v_board, v_nome
    FROM public.atividades_labels WHERE id = _label_id;
  IF v_board IS NULL THEN RETURN; END IF;
  IF NOT public.atividades_can_admin_board(v_board) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  DELETE FROM public.atividades_labels WHERE id = _label_id;
  INSERT INTO public.atividades_board_historico(board_id, user_id, evento, payload)
  VALUES (v_board, auth.uid(), 'etiqueta_excluida',
    jsonb_build_object('label_id', _label_id, 'nome', v_nome));
END $$;
