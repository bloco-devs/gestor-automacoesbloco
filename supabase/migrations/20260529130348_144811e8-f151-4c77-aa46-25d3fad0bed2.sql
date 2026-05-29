-- Posições dos nós no diagrama (globais, compartilhadas)
CREATE TABLE public.solucao_diagrama_posicoes (
  solucao_id uuid PRIMARY KEY REFERENCES public.solucoes(id) ON DELETE CASCADE,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solucao_diagrama_posicoes TO authenticated;
GRANT ALL ON public.solucao_diagrama_posicoes TO service_role;

ALTER TABLE public.solucao_diagrama_posicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed users can view posicoes"
ON public.solucao_diagrama_posicoes FOR SELECT TO authenticated
USING (private.is_allowed_user());

CREATE POLICY "Admins can insert posicoes"
ON public.solucao_diagrama_posicoes FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update posicoes"
ON public.solucao_diagrama_posicoes FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete posicoes"
ON public.solucao_diagrama_posicoes FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_posicoes_updated_at
BEFORE UPDATE ON public.solucao_diagrama_posicoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conexões (arestas) entre Soluções
CREATE TABLE public.solucao_diagrama_conexoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.solucoes(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.solucoes(id) ON DELETE CASCADE,
  label text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solucao_diagrama_conexoes_no_self CHECK (source_id <> target_id),
  CONSTRAINT solucao_diagrama_conexoes_unique UNIQUE (source_id, target_id)
);

CREATE INDEX idx_conexoes_source ON public.solucao_diagrama_conexoes(source_id);
CREATE INDEX idx_conexoes_target ON public.solucao_diagrama_conexoes(target_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solucao_diagrama_conexoes TO authenticated;
GRANT ALL ON public.solucao_diagrama_conexoes TO service_role;

ALTER TABLE public.solucao_diagrama_conexoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed users can view conexoes"
ON public.solucao_diagrama_conexoes FOR SELECT TO authenticated
USING (private.is_allowed_user());

CREATE POLICY "Admins can insert conexoes"
ON public.solucao_diagrama_conexoes FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND (created_by IS NULL OR created_by = auth.uid()));

CREATE POLICY "Admins can update conexoes"
ON public.solucao_diagrama_conexoes FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete conexoes"
ON public.solucao_diagrama_conexoes FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));