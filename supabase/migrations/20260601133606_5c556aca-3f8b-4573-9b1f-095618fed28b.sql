CREATE TABLE public.solucao_diagrama_conexao_colunas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conexao_id uuid NOT NULL REFERENCES public.solucao_diagrama_conexoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'VARCHAR',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solucao_diagrama_conexao_colunas TO authenticated;
GRANT ALL ON public.solucao_diagrama_conexao_colunas TO service_role;

ALTER TABLE public.solucao_diagrama_conexao_colunas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed users can view conexao colunas"
ON public.solucao_diagrama_conexao_colunas
FOR SELECT TO authenticated
USING (private.is_allowed_user());

CREATE POLICY "Admins can insert conexao colunas"
ON public.solucao_diagrama_conexao_colunas
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND ((created_by IS NULL) OR (created_by = auth.uid())));

CREATE POLICY "Admins can update conexao colunas"
ON public.solucao_diagrama_conexao_colunas
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete conexao colunas"
ON public.solucao_diagrama_conexao_colunas
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_diagrama_colunas_conexao ON public.solucao_diagrama_conexao_colunas(conexao_id);

CREATE TRIGGER trg_diagrama_colunas_updated_at
BEFORE UPDATE ON public.solucao_diagrama_conexao_colunas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();