DROP POLICY IF EXISTS "Personas viewable by authenticated" ON public.atividades_personas;
CREATE POLICY "Personas viewable by allowed users" ON public.atividades_personas FOR SELECT TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "sla_policies read auth" ON public.sla_policies;
CREATE POLICY "sla_policies read allowed users" ON public.sla_policies FOR SELECT TO authenticated USING (public.is_allowed_user());