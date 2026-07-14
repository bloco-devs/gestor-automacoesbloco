-- Q3.6 Bloco 1: favoritas por usuário
CREATE TABLE IF NOT EXISTS public.atividades_label_favoritos (
  label_id uuid NOT NULL REFERENCES public.atividades_labels(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (label_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.atividades_label_favoritos TO authenticated;
GRANT ALL ON public.atividades_label_favoritos TO service_role;

ALTER TABLE public.atividades_label_favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "label_fav_select_own" ON public.atividades_label_favoritos;
CREATE POLICY "label_fav_select_own" ON public.atividades_label_favoritos
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "label_fav_insert_own" ON public.atividades_label_favoritos;
CREATE POLICY "label_fav_insert_own" ON public.atividades_label_favoritos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "label_fav_delete_own" ON public.atividades_label_favoritos;
CREATE POLICY "label_fav_delete_own" ON public.atividades_label_favoritos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_label_fav_user ON public.atividades_label_favoritos(user_id);

-- Toggle RPC
CREATE OR REPLACE FUNCTION public.atividades_label_toggle_favorita(_label_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_board uuid;
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;
  SELECT board_id INTO v_board FROM public.atividades_labels WHERE id = _label_id;
  IF v_board IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE='P0002';
  END IF;
  IF NOT public.atividades_can_view_board(v_board, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.atividades_label_favoritos
    WHERE label_id = _label_id AND user_id = v_uid
  ) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.atividades_label_favoritos
     WHERE label_id = _label_id AND user_id = v_uid;
    RETURN false;
  ELSE
    INSERT INTO public.atividades_label_favoritos(label_id, user_id)
    VALUES (_label_id, v_uid);
    RETURN true;
  END IF;
END;
$$;

-- Backfill: labels favoritas hoje → favoritas do criador do board
INSERT INTO public.atividades_label_favoritos (label_id, user_id)
SELECT l.id, b.criado_por
  FROM public.atividades_labels l
  JOIN public.atividades_boards b ON b.id = l.board_id
 WHERE l.favorita = true
   AND b.criado_por IS NOT NULL
ON CONFLICT DO NOTHING;
