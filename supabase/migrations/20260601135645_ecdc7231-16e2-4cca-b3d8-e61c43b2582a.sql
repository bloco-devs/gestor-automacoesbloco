
CREATE TABLE public.solucao_diagrama_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL DEFAULT '',
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  largura numeric NOT NULL DEFAULT 220,
  altura numeric NOT NULL DEFAULT 160,
  cor text NOT NULL DEFAULT 'amarelo',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solucao_diagrama_notas TO authenticated;
GRANT ALL ON public.solucao_diagrama_notas TO service_role;

ALTER TABLE public.solucao_diagrama_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed users can view notas"
ON public.solucao_diagrama_notas FOR SELECT TO authenticated
USING (private.is_allowed_user());

CREATE POLICY "Admins can insert notas"
ON public.solucao_diagrama_notas FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role)
            AND (created_by IS NULL OR created_by = auth.uid()));

CREATE POLICY "Admins can update notas"
ON public.solucao_diagrama_notas FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete notas"
ON public.solucao_diagrama_notas FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_solucao_diagrama_notas_updated_at
BEFORE UPDATE ON public.solucao_diagrama_notas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
