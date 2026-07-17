CREATE OR REPLACE VIEW public.atividades_boards_resumo
WITH (security_invoker = on) AS
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
    SELECT 1
    FROM public.atividades_board_favoritos f
    WHERE f.board_id = b.id
      AND f.user_id = auth.uid()
  ) AS favorito,
  public.atividades_board_role(b.id, auth.uid()) AS meu_papel,
  (
    SELECT max(al.created_at)
    FROM public.atividades_atividade_log al
    JOIN public.atividades_cards c ON c.id = al.card_id
    WHERE c.board_id = b.id
  ) AS ultima_atividade,
  b.cover_url
FROM public.atividades_boards b
JOIN public.atividades_workspaces w ON w.id = b.workspace_id;

DROP POLICY IF EXISTS boards_select_membros ON public.atividades_boards;
CREATE POLICY boards_select_membros
ON public.atividades_boards
FOR SELECT
TO authenticated
USING (
  visibilidade = 'public'
  OR (visibilidade = 'workspace' AND public.is_allowed_user())
  OR EXISTS (
    SELECT 1
    FROM public.atividades_board_membros m
    WHERE m.board_id = atividades_boards.id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Capas: visualizar (allowed_user)" ON storage.objects;
DROP POLICY IF EXISTS "Capas: visualizar (quem vê o quadro)" ON storage.objects;
CREATE POLICY "Capas: visualizar (quem vê o quadro)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'atividades-capas'
  AND public.atividades_can_view_board(((storage.foldername(name))[1])::uuid)
);