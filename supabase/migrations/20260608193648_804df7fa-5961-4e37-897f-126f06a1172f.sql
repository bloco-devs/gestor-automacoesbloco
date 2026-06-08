
CREATE TABLE public.atividades_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.atividades_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_atividades_comentarios_card ON public.atividades_comentarios(card_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_comentarios TO authenticated;
GRANT ALL ON public.atividades_comentarios TO service_role;

ALTER TABLE public.atividades_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver comentários"
ON public.atividades_comentarios FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar comentários"
ON public.atividades_comentarios FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Autor pode editar seu comentário"
ON public.atividades_comentarios FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Autor pode excluir seu comentário"
ON public.atividades_comentarios FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE TRIGGER update_atividades_comentarios_updated_at
BEFORE UPDATE ON public.atividades_comentarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
