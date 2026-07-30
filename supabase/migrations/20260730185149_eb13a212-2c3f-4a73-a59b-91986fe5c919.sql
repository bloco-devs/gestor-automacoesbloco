CREATE TABLE IF NOT EXISTS public.atividades_card_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.atividades_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.atividades_card_membros TO authenticated;
GRANT ALL ON public.atividades_card_membros TO service_role;

ALTER TABLE public.atividades_card_membros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_membros_select" ON public.atividades_card_membros;
CREATE POLICY "card_membros_select" ON public.atividades_card_membros
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.atividades_cards c
   WHERE c.id = card_id AND public.atividades_can_view_board(c.board_id)
));

DROP POLICY IF EXISTS "card_membros_insert" ON public.atividades_card_membros;
CREATE POLICY "card_membros_insert" ON public.atividades_card_membros
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.atividades_cards c
   WHERE c.id = card_id AND public.atividades_can_edit_board(c.board_id)
));

DROP POLICY IF EXISTS "card_membros_delete" ON public.atividades_card_membros;
CREATE POLICY "card_membros_delete" ON public.atividades_card_membros
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.atividades_cards c
   WHERE c.id = card_id AND public.atividades_can_edit_board(c.board_id)
));

CREATE INDEX IF NOT EXISTS atividades_card_membros_card_idx ON public.atividades_card_membros(card_id);

CREATE OR REPLACE FUNCTION public.list_equipe_users()
RETURNS TABLE(id uuid, nome text, email text, role text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    u.id,
    COALESCE(NULLIF(p.nome, ''), ae.nome, split_part(u.email::text, '@', 1)) AS nome,
    u.email::text AS email,
    ae.role,
    p.avatar_url
  FROM public.allowed_emails ae
  JOIN auth.users u ON lower(u.email::text) = ae.email
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ae.role IN ('developer','administrador')
    AND public.is_allowed_user()
  ORDER BY nome;
$$;

REVOKE ALL ON FUNCTION public.list_equipe_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_equipe_users() TO authenticated;