-- Add application fields needed to store demand workflow data in Supabase instead of browser localStorage
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS titulo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS frequencia smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS complexidade smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS retorno smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS dificuldade smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notas_tecnicas text,
  ADD COLUMN IF NOT EXISTS tem_integracao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS integracoes text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS solicitante_nome text NOT NULL DEFAULT '';

-- Backfill titles/names for existing rows so the UI has safe display values
UPDATE public.solicitacoes
SET
  titulo = CASE WHEN titulo = '' THEN COALESCE(NULLIF(tipo, ''), left(descricao, 80), 'Solicitação') ELSE titulo END,
  solicitante_nome = CASE WHEN solicitante_nome = '' THEN COALESCE(NULLIF(nome, ''), 'Solicitante') ELSE solicitante_nome END,
  score = CASE WHEN score = 0 THEN round(((frequencia + complexidade + retorno + (6 - dificuldade))::numeric / 20) * 100)::integer ELSE score END;

-- Store delivered solutions for demands with RLS instead of localStorage
CREATE TABLE IF NOT EXISTS public.demanda_solucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_solucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allowed users can view demanda_solucoes" ON public.demanda_solucoes;
CREATE POLICY "Allowed users can view demanda_solucoes"
ON public.demanda_solucoes
FOR SELECT
TO authenticated
USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can insert demanda_solucoes" ON public.demanda_solucoes;
CREATE POLICY "Allowed users can insert demanda_solucoes"
ON public.demanda_solucoes
FOR INSERT
TO authenticated
WITH CHECK (public.is_allowed_user() AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS "Allowed users can update demanda_solucoes" ON public.demanda_solucoes;
CREATE POLICY "Allowed users can update demanda_solucoes"
ON public.demanda_solucoes
FOR UPDATE
TO authenticated
USING (public.is_allowed_user())
WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can delete demanda_solucoes" ON public.demanda_solucoes;
CREATE POLICY "Allowed users can delete demanda_solucoes"
ON public.demanda_solucoes
FOR DELETE
TO authenticated
USING (public.is_allowed_user());

-- Store solution improvements with RLS instead of localStorage
CREATE TABLE IF NOT EXISTS public.demanda_melhorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solucao_id uuid NOT NULL REFERENCES public.demanda_solucoes(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'planejada',
  data timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_melhorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allowed users can view demanda_melhorias" ON public.demanda_melhorias;
CREATE POLICY "Allowed users can view demanda_melhorias"
ON public.demanda_melhorias
FOR SELECT
TO authenticated
USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can insert demanda_melhorias" ON public.demanda_melhorias;
CREATE POLICY "Allowed users can insert demanda_melhorias"
ON public.demanda_melhorias
FOR INSERT
TO authenticated
WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can update demanda_melhorias" ON public.demanda_melhorias;
CREATE POLICY "Allowed users can update demanda_melhorias"
ON public.demanda_melhorias
FOR UPDATE
TO authenticated
USING (public.is_allowed_user())
WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "Allowed users can delete demanda_melhorias" ON public.demanda_melhorias;
CREATE POLICY "Allowed users can delete demanda_melhorias"
ON public.demanda_melhorias
FOR DELETE
TO authenticated
USING (public.is_allowed_user());

-- Keep internal SECURITY DEFINER helpers callable by policies/triggers, but not directly through exposed API roles
REVOKE EXECUTE ON FUNCTION public.is_allowed_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_allowed_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_data_atualizacao() FROM PUBLIC, anon, authenticated;