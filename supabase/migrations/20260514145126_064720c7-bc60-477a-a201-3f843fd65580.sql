ALTER TABLE public.solicitacoes
ADD COLUMN IF NOT EXISTS notas_tecnicas_complexidade text;

UPDATE public.solicitacoes s
SET notas_tecnicas_complexidade = s.notas_tecnicas
WHERE s.notas_tecnicas IS NOT NULL
  AND s.notas_tecnicas_complexidade IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = s.user_id AND ur.role = 'admin'
  );