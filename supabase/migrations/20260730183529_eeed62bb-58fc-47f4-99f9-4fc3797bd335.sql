-- Grants (Data API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_etiquetas TO authenticated;
GRANT ALL ON public.atividades_etiquetas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_card_etiquetas TO authenticated;
GRANT ALL ON public.atividades_card_etiquetas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_checklists TO authenticated;
GRANT ALL ON public.atividades_checklists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_checklist_items TO authenticated;
GRANT ALL ON public.atividades_checklist_items TO service_role;

-- Defaults / integridade
ALTER TABLE public.atividades_checklist_items ALTER COLUMN concluido SET DEFAULT false;
ALTER TABLE public.atividades_checklist_items ALTER COLUMN ordem SET DEFAULT 0;
ALTER TABLE public.atividades_checklists ALTER COLUMN ordem SET DEFAULT 0;

-- Etiquetas: escopo por quadro
DROP POLICY IF EXISTS "etiquetas_select" ON public.atividades_etiquetas;
CREATE POLICY "etiquetas_select" ON public.atividades_etiquetas FOR SELECT TO authenticated
USING (board_id IS NOT NULL AND public.atividades_can_view_board(board_id, auth.uid()));

DROP POLICY IF EXISTS "etiquetas_write" ON public.atividades_etiquetas;
CREATE POLICY "etiquetas_write" ON public.atividades_etiquetas FOR ALL TO authenticated
USING (board_id IS NOT NULL AND public.atividades_can_edit_board(board_id, auth.uid()))
WITH CHECK (board_id IS NOT NULL AND public.atividades_can_edit_board(board_id, auth.uid()));

-- Vínculo cartão <-> etiqueta
DROP POLICY IF EXISTS "card_etiquetas_select" ON public.atividades_card_etiquetas;
CREATE POLICY "card_etiquetas_select" ON public.atividades_card_etiquetas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = card_id AND public.atividades_can_view_board(c.board_id, auth.uid())));

DROP POLICY IF EXISTS "card_etiquetas_write" ON public.atividades_card_etiquetas;
CREATE POLICY "card_etiquetas_write" ON public.atividades_card_etiquetas FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = card_id AND public.atividades_can_edit_board(c.board_id, auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = card_id AND public.atividades_can_edit_board(c.board_id, auth.uid())));

-- Checklists
DROP POLICY IF EXISTS "checklists_select" ON public.atividades_checklists;
CREATE POLICY "checklists_select" ON public.atividades_checklists FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = card_id AND public.atividades_can_view_board(c.board_id, auth.uid())));

DROP POLICY IF EXISTS "checklists_write" ON public.atividades_checklists;
CREATE POLICY "checklists_write" ON public.atividades_checklists FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = card_id AND public.atividades_can_edit_board(c.board_id, auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.atividades_cards c WHERE c.id = card_id AND public.atividades_can_edit_board(c.board_id, auth.uid())));

-- Itens de checklist
DROP POLICY IF EXISTS "checklist_items_select" ON public.atividades_checklist_items;
CREATE POLICY "checklist_items_select" ON public.atividades_checklist_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.atividades_checklists cl
  JOIN public.atividades_cards c ON c.id = cl.card_id
  WHERE cl.id = checklist_id AND public.atividades_can_view_board(c.board_id, auth.uid())
));

DROP POLICY IF EXISTS "checklist_items_write" ON public.atividades_checklist_items;
CREATE POLICY "checklist_items_write" ON public.atividades_checklist_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.atividades_checklists cl
  JOIN public.atividades_cards c ON c.id = cl.card_id
  WHERE cl.id = checklist_id AND public.atividades_can_edit_board(c.board_id, auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.atividades_checklists cl
  JOIN public.atividades_cards c ON c.id = cl.card_id
  WHERE cl.id = checklist_id AND public.atividades_can_edit_board(c.board_id, auth.uid())
));