CREATE TABLE public.tipos_demanda (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tipos_demanda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed users can view tipos_demanda"
  ON public.tipos_demanda FOR SELECT
  TO authenticated
  USING (private.is_allowed_user());

CREATE POLICY "Admins can insert tipos_demanda"
  ON public.tipos_demanda FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tipos_demanda"
  ON public.tipos_demanda FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tipos_demanda"
  ON public.tipos_demanda FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tipos_demanda_updated_at
  BEFORE UPDATE ON public.tipos_demanda
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tipos_demanda (nome, descricao) VALUES
  ('Automação', 'Automação de processos e fluxos repetitivos'),
  ('Integração', 'Integração entre sistemas e ferramentas'),
  ('Relatório', 'Relatórios, dashboards e visualizações de dados'),
  ('Aplicação', 'Aplicações internas e ferramentas customizadas'),
  ('Melhoria', 'Melhorias em soluções existentes')
ON CONFLICT (nome) DO NOTHING;