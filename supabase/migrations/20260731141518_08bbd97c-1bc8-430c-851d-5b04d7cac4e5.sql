-- A pasta do bucket 'boards-backgrounds' é o id de quem enviou (não o id do quadro),
-- então a visibilidade não pode ser derivada do caminho como em 'atividades-capas'.
-- O vínculo real é o campo atividades_boards.background, que guarda a URL assinada
-- contendo o caminho do objeto. Esta função faz esse elo, em SECURITY DEFINER para
-- não depender do RLS da tabela de quadros.
CREATE OR REPLACE FUNCTION public.atividades_can_view_board_background(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.atividades_boards b
     WHERE b.background IS NOT NULL
       -- strpos e não LIKE: o nome do objeto vem de fora e não deve ser
       -- interpretado como padrão de curinga.
       AND strpos(b.background, 'boards-backgrounds/' || _object_name) > 0
       AND public.atividades_can_view_board(b.id)
  );
$$;

REVOKE ALL ON FUNCTION public.atividades_can_view_board_background(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atividades_can_view_board_background(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.atividades_can_view_board_background(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atividades_can_view_board_background(text) TO service_role;

DROP POLICY IF EXISTS "Fundos de quadro: ver (equipe permitida)" ON storage.objects;

CREATE POLICY "Fundos de quadro: ver (dono ou quem ve o quadro)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'boards-backgrounds'
  AND (
    -- quem enviou continua vendo o próprio arquivo (inclusive antes de o
    -- quadro existir, no meio do fluxo de criação)
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.atividades_can_view_board_background(name)
  )
);