
-- 1) atividades_personas
CREATE TABLE public.atividades_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.atividades_personas TO authenticated;
GRANT ALL ON public.atividades_personas TO service_role;

ALTER TABLE public.atividades_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personas viewable by authenticated"
  ON public.atividades_personas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Personas managed by admin - insert"
  ON public.atividades_personas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Personas managed by admin - update"
  ON public.atividades_personas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Personas managed by admin - delete"
  ON public.atividades_personas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_atividades_personas_updated_at
  BEFORE UPDATE ON public.atividades_personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_atividades_personas_user_id ON public.atividades_personas(user_id);

-- 2) prioridade em atividades_cards
ALTER TABLE public.atividades_cards
  ADD COLUMN prioridade text NOT NULL DEFAULT 'media'
  CHECK (prioridade IN ('baixa','media','alta','urgente'));
