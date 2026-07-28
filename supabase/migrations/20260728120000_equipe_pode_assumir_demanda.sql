-- O desenvolvedor não conseguia assumir uma demanda
--
-- SINTOMA
-- Clicar em "Assumir" não fazia nada. Sem erro, sem toast, sem log — o botão
-- parecia morto. Esse silêncio é a assinatura de uma política de RLS negando
-- um UPDATE: o Postgres não rejeita a operação, ele apenas não encontra
-- nenhuma linha visível para atualizar. Zero linhas afetadas é um resultado
-- de sucesso, e o cliente não tem como distinguir de "atualizou".
--
-- CAUSA
-- A política de UPDATE de `demands` autoriza três casos:
--   created_by = auth.uid()            quem abriu
--   assigned_to = auth.uid()           quem JÁ é o responsável
--   has_role(auth.uid(), 'admin')      admin em public.user_roles
--
-- Assumir é justamente o ato de virar responsável de algo que ainda não é
-- seu. Um desenvolvedor que não abriu a demanda não satisfaz nenhuma das
-- três condições — a permissão exigia o estado que a ação queria criar.
--
-- Há ainda um segundo descompasso: o papel real do produto vive em
-- `allowed_emails.role` ('administrador' | 'developer' | 'builder' |
-- 'requester') e é lido por `get_my_role()`. `has_role(..., 'admin')` olha
-- outra tabela (`user_roles`, enum 'admin'|'user'), que o fluxo de cadastro
-- atual não popula. Na prática, portanto, nem administrador passava.
--
-- CORREÇÃO
-- Quem é da equipe (developer ou administrador) pode atualizar qualquer
-- demanda. É o mesmo critério que a interface já usa para decidir se mostra
-- as ações do Copiloto (`daEquipe` em DemandaDetalhe.tsx) — a diferença é que
-- até agora a interface oferecia e o banco recusava.
--
-- O que NÃO muda: o solicitante continua com acesso apenas às demandas que
-- ele abriu.

CREATE OR REPLACE FUNCTION public.is_equipe()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() IN ('developer', 'administrador');
$$;

GRANT EXECUTE ON FUNCTION public.is_equipe() TO authenticated;

DROP POLICY IF EXISTS "demands_update_own_or_admin" ON public.demands;

CREATE POLICY "demands_update_own_or_equipe" ON public.demands
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_equipe()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_equipe()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
