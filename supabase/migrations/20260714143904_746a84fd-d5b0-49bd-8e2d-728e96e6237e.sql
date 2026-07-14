
-- =========================================================
-- Onda Q1 — Workspaces + Quadros (aditiva)
-- =========================================================

-- 1) WORKSPACES ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atividades_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  cor text,
  icone text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_workspaces TO authenticated;
GRANT ALL ON public.atividades_workspaces TO service_role;
ALTER TABLE public.atividades_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspaces_select_allowed ON public.atividades_workspaces;
CREATE POLICY workspaces_select_allowed ON public.atividades_workspaces
  FOR SELECT USING (public.is_allowed_user());

DROP POLICY IF EXISTS workspaces_admin_all ON public.atividades_workspaces;
CREATE POLICY workspaces_admin_all ON public.atividades_workspaces
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.atividades_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed workspace padrão
INSERT INTO public.atividades_workspaces (slug, nome, descricao)
VALUES ('grupo-bloco', 'Grupo Bloco', 'Workspace padrão do Grupo Bloco')
ON CONFLICT (slug) DO NOTHING;

-- 2) BOARDS: expandir estrutura --------------------------------------------
ALTER TABLE public.atividades_boards
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.atividades_workspaces(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS cor text,
  ADD COLUMN IF NOT EXISTS icone text,
  ADD COLUMN IF NOT EXISTS background text,
  ADD COLUMN IF NOT EXISTS visibilidade text NOT NULL DEFAULT 'workspace'
    CHECK (visibilidade IN ('private','workspace','public')),
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

-- Vincula quadros existentes ao workspace padrão + renomeia "Atividades" -> "Kanban Geral"
UPDATE public.atividades_boards
   SET workspace_id = (SELECT id FROM public.atividades_workspaces WHERE slug = 'grupo-bloco')
 WHERE workspace_id IS NULL;

UPDATE public.atividades_boards
   SET nome = 'Kanban Geral'
 WHERE slug = 'default' AND nome = 'Atividades';

ALTER TABLE public.atividades_boards
  ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_boards_workspace ON public.atividades_boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_boards_arquivado ON public.atividades_boards(arquivado);

-- 3) MEMBROS DO QUADRO -----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.atividades_board_role AS ENUM ('owner','admin','member','observer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.atividades_board_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.atividades_boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.atividades_board_role NOT NULL DEFAULT 'member',
  convidado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_board_membros TO authenticated;
GRANT ALL ON public.atividades_board_membros TO service_role;
ALTER TABLE public.atividades_board_membros ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_board_membros_board ON public.atividades_board_membros(board_id);
CREATE INDEX IF NOT EXISTS idx_board_membros_user ON public.atividades_board_membros(user_id);

CREATE TRIGGER trg_board_membros_updated_at
  BEFORE UPDATE ON public.atividades_board_membros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) FUNÇÕES DE PERMISSÃO POR QUADRO ---------------------------------------
CREATE OR REPLACE FUNCTION public.atividades_board_role(_board_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS public.atividades_board_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.atividades_board_membros
   WHERE board_id = _board_id AND user_id = _user_id
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.atividades_can_view_board(_board_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.atividades_boards b
      WHERE b.id = _board_id
        AND (
          b.visibilidade = 'public'
          OR (b.visibilidade = 'workspace' AND public.is_allowed_user())
          OR EXISTS (
            SELECT 1 FROM public.atividades_board_membros m
             WHERE m.board_id = _board_id AND m.user_id = _user_id
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.atividades_can_edit_board(_board_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.atividades_board_membros m
       WHERE m.board_id = _board_id
         AND m.user_id  = _user_id
         AND m.role IN ('owner','admin','member')
    );
$$;

CREATE OR REPLACE FUNCTION public.atividades_can_admin_board(_board_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.atividades_board_membros m
       WHERE m.board_id = _board_id
         AND m.user_id  = _user_id
         AND m.role IN ('owner','admin')
    );
$$;

-- RLS para membros: ver quem é membro se você mesmo puder ver o quadro; administrar via can_admin_board
DROP POLICY IF EXISTS board_membros_select ON public.atividades_board_membros;
CREATE POLICY board_membros_select ON public.atividades_board_membros
  FOR SELECT USING (public.atividades_can_view_board(board_id));

DROP POLICY IF EXISTS board_membros_admin_write ON public.atividades_board_membros;
CREATE POLICY board_membros_admin_write ON public.atividades_board_membros
  FOR ALL USING (public.atividades_can_admin_board(board_id))
  WITH CHECK (public.atividades_can_admin_board(board_id));

-- 5) FAVORITOS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atividades_board_favoritos (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.atividades_boards(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, board_id)
);

GRANT SELECT, INSERT, DELETE ON public.atividades_board_favoritos TO authenticated;
GRANT ALL ON public.atividades_board_favoritos TO service_role;
ALTER TABLE public.atividades_board_favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favoritos_self ON public.atividades_board_favoritos;
CREATE POLICY favoritos_self ON public.atividades_board_favoritos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.atividades_can_view_board(board_id));

-- 6) HISTÓRICO DE QUADRO ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atividades_board_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.atividades_boards(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  evento text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.atividades_board_historico TO authenticated;
GRANT ALL ON public.atividades_board_historico TO service_role;
ALTER TABLE public.atividades_board_historico ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_board_hist_board ON public.atividades_board_historico(board_id, created_at DESC);

DROP POLICY IF EXISTS board_hist_select ON public.atividades_board_historico;
CREATE POLICY board_hist_select ON public.atividades_board_historico
  FOR SELECT USING (public.atividades_can_view_board(board_id));

DROP POLICY IF EXISTS board_hist_block_insert ON public.atividades_board_historico;
CREATE POLICY board_hist_block_insert ON public.atividades_board_historico
  FOR INSERT WITH CHECK (false);

-- 7) POLÍTICAS ADITIVAS EM BOARDS ------------------------------------------
DROP POLICY IF EXISTS boards_select_membros ON public.atividades_boards;
CREATE POLICY boards_select_membros ON public.atividades_boards
  FOR SELECT USING (
    visibilidade = 'public'
    OR (visibilidade = 'workspace' AND public.is_allowed_user())
    OR EXISTS (
      SELECT 1 FROM public.atividades_board_membros m
       WHERE m.board_id = id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS boards_update_admins ON public.atividades_boards;
CREATE POLICY boards_update_admins ON public.atividades_boards
  FOR UPDATE USING (public.atividades_can_admin_board(id))
  WITH CHECK (public.atividades_can_admin_board(id));

-- 8) VIEW RESUMIDA ---------------------------------------------------------
CREATE OR REPLACE VIEW public.atividades_boards_resumo
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.slug,
  b.nome,
  b.descricao,
  b.cor,
  b.icone,
  b.background,
  b.visibilidade,
  b.arquivado,
  b.workspace_id,
  w.nome AS workspace_nome,
  b.criado_por,
  b.created_at,
  b.updated_at,
  (SELECT count(*) FROM public.atividades_cards c WHERE c.board_id = b.id) AS total_cards,
  (SELECT count(*) FROM public.atividades_cards c WHERE c.board_id = b.id AND c.concluido = false) AS cards_abertos,
  (SELECT count(*) FROM public.atividades_board_membros m WHERE m.board_id = b.id) AS total_membros,
  EXISTS (
    SELECT 1 FROM public.atividades_board_favoritos f
     WHERE f.board_id = b.id AND f.user_id = auth.uid()
  ) AS favorito,
  public.atividades_board_role(b.id, auth.uid()) AS meu_papel,
  (SELECT max(al.created_at)
     FROM public.atividades_atividade_log al
     JOIN public.atividades_cards c ON c.id = al.card_id
    WHERE c.board_id = b.id) AS ultima_atividade
FROM public.atividades_boards b
JOIN public.atividades_workspaces w ON w.id = b.workspace_id;

GRANT SELECT ON public.atividades_boards_resumo TO authenticated;

-- 9) RPCs ------------------------------------------------------------------

-- Criar novo quadro (criador vira owner)
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

  INSERT INTO public.atividades_board_historico (board_id, user_id, evento, payload)
  VALUES (v_id, v_uid, 'board_criado', jsonb_build_object('nome', _nome));

  RETURN v_id;
END;
$$;

-- Convidar / atualizar papel de um membro
CREATE OR REPLACE FUNCTION public.atividades_board_add_member(
  _board_id uuid, _user_id uuid, _role public.atividades_board_role DEFAULT 'member'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.atividades_board_membros (board_id, user_id, role, convidado_por)
  VALUES (_board_id, _user_id, _role, auth.uid())
  ON CONFLICT (board_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();

  INSERT INTO public.atividades_board_historico (board_id, user_id, evento, payload)
  VALUES (_board_id, auth.uid(), 'membro_adicionado', jsonb_build_object('user_id', _user_id, 'role', _role));
END;
$$;

CREATE OR REPLACE FUNCTION public.atividades_board_remove_member(_board_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  DELETE FROM public.atividades_board_membros WHERE board_id = _board_id AND user_id = _user_id;
  INSERT INTO public.atividades_board_historico (board_id, user_id, evento, payload)
  VALUES (_board_id, auth.uid(), 'membro_removido', jsonb_build_object('user_id', _user_id));
END;
$$;

-- Alternar favorito
CREATE OR REPLACE FUNCTION public.atividades_board_toggle_favorito(_board_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_exists boolean;
BEGIN
  IF NOT public.atividades_can_view_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.atividades_board_favoritos WHERE user_id=auth.uid() AND board_id=_board_id)
    INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.atividades_board_favoritos WHERE user_id=auth.uid() AND board_id=_board_id;
    RETURN false;
  ELSE
    INSERT INTO public.atividades_board_favoritos(user_id, board_id) VALUES (auth.uid(), _board_id);
    RETURN true;
  END IF;
END;
$$;

-- Arquivar / desarquivar
CREATE OR REPLACE FUNCTION public.atividades_board_set_arquivado(_board_id uuid, _arquivado boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.atividades_can_admin_board(_board_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.atividades_boards
     SET arquivado = _arquivado,
         arquivado_em = CASE WHEN _arquivado THEN now() ELSE NULL END
   WHERE id = _board_id;
  INSERT INTO public.atividades_board_historico (board_id, user_id, evento, payload)
  VALUES (_board_id, auth.uid(), CASE WHEN _arquivado THEN 'board_arquivado' ELSE 'board_desarquivado' END, '{}'::jsonb);
END;
$$;

-- 10) SEED do "Kanban Geral" — adiciona todos os admins/builders/devs como membros (owner)
INSERT INTO public.atividades_board_membros (board_id, user_id, role, convidado_por)
SELECT b.id, u.id, 'owner'::public.atividades_board_role, NULL
  FROM public.atividades_boards b
  CROSS JOIN auth.users u
  JOIN public.allowed_emails ae ON lower(u.email) = ae.email
 WHERE b.slug = 'default'
   AND ae.role IN ('developer','administrador','builder')
ON CONFLICT (board_id, user_id) DO NOTHING;
