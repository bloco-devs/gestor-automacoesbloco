-- Ninguém enxergava o nome de ninguém
--
-- SINTOMA
-- A demanda não mostrava quem a abriu, e toda mensagem de outra pessoa no fio
-- aparecia como "Alguém". Um help desk em que não se sabe quem pediu nem quem
-- respondeu não é um help desk — é uma caixa de texto anônima.
--
-- CAUSA
-- A tabela `profiles` (nome, e-mail, avatar) tinha exatamente duas políticas
-- de leitura:
--   auth.uid() = id                    o próprio perfil
--   has_role(auth.uid(), 'admin')      admin em public.user_roles
--
-- A segunda nunca se aplica na prática: o papel real do produto vive em
-- `allowed_emails.role` e `user_roles` não é populada pelo cadastro atual.
-- Resultado: cada pessoa só conseguia ler o próprio perfil. Os nomes dos
-- outros não vinham, e a interface caía no rótulo genérico.
--
-- Esse é o mesmo descompasso que impedia o "Assumir" de funcionar — a
-- diferença é que aqui ele falhava calado, sem nem parecer um erro.
--
-- CORREÇÃO
-- Quem está autorizado a usar o sistema (`is_allowed_user()`) pode ler os
-- perfis dos colegas. É a mesma premissa de qualquer ferramenta interna de
-- empresa: as pessoas da organização se conhecem pelo nome.
--
-- ESCOPO, DE PROPÓSITO
-- Só leitura, e só para quem já passou pela lista de acesso — usuário fora
-- dela continua sem ver nada. Escrita permanece restrita ao próprio perfil:
-- a política de UPDATE não é tocada aqui.

CREATE POLICY "Usuários autorizados veem os perfis da equipe"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_allowed_user());
