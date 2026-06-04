
CREATE TABLE public.atividades_colunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.atividades_colunas TO authenticated;
GRANT ALL ON public.atividades_colunas TO service_role;

ALTER TABLE public.atividades_colunas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed users can view atividades_colunas"
  ON public.atividades_colunas FOR SELECT TO authenticated
  USING (private.is_allowed_user());

INSERT INTO public.atividades_colunas (chave, nome, ordem) VALUES
  ('backlog', 'Backlog', 1),
  ('a_fazer', 'A Fazer', 2),
  ('em_andamento', 'Em Andamento', 3),
  ('em_revisao', 'Em Revisão', 4),
  ('concluido', 'Concluído', 5);

CREATE TABLE public.atividades_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coluna_id uuid NOT NULL REFERENCES public.atividades_colunas(id) ON DELETE RESTRICT,
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  responsavel_id uuid,
  solucao_id uuid REFERENCES public.demanda_solucoes(id) ON DELETE SET NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades_cards TO authenticated;
GRANT ALL ON public.atividades_cards TO service_role;

ALTER TABLE public.atividades_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view atividades_cards"
  ON public.atividades_cards FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert atividades_cards"
  ON public.atividades_cards FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND (created_by IS NULL OR created_by = auth.uid()));

CREATE POLICY "Admins can update atividades_cards"
  ON public.atividades_cards FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete atividades_cards"
  ON public.atividades_cards FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER atividades_cards_set_updated_at
  BEFORE UPDATE ON public.atividades_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX atividades_cards_coluna_idx ON public.atividades_cards(coluna_id, ordem);
