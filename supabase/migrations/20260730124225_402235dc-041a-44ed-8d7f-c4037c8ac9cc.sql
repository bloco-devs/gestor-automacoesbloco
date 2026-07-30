CREATE OR REPLACE FUNCTION public.atividades_can_view_board(_board_id uuid, _user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.atividades_boards b
      WHERE b.id = _board_id
        AND (
          (b.visibilidade IN ('public','workspace') AND public.is_allowed_user())
          OR EXISTS (
            SELECT 1 FROM public.atividades_board_membros m
             WHERE m.board_id = _board_id AND m.user_id = _user_id
          )
        )
    );
$function$;

DROP POLICY IF EXISTS boards_select_membros ON public.atividades_boards;
CREATE POLICY boards_select_membros ON public.atividades_boards
FOR SELECT TO authenticated
USING (
  (visibilidade IN ('public','workspace') AND public.is_allowed_user())
  OR EXISTS (
    SELECT 1 FROM public.atividades_board_membros m
     WHERE m.board_id = atividades_boards.id AND m.user_id = auth.uid()
  )
);