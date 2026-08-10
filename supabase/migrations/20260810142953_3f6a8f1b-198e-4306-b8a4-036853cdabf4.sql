ALTER TABLE public.demand_comments
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.demands_mensagem_de_boas_vindas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.demand_comments (demand_id, user_id, content, is_internal, is_ai, is_system)
  VALUES (
    NEW.id,
    NULL,
    'Olá! A sua demanda foi registada com sucesso e encontra-se na nossa fila de triagem. Em breve, um membro da nossa equipa técnica irá assumi-la.',
    false,
    false,
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demands_mensagem_de_boas_vindas ON public.demands;
CREATE TRIGGER demands_mensagem_de_boas_vindas
AFTER INSERT ON public.demands
FOR EACH ROW EXECUTE FUNCTION public.demands_mensagem_de_boas_vindas();

DROP POLICY IF EXISTS "Authenticated insert own comments" ON public.demand_comments;
CREATE POLICY "Authenticated insert own comments"
ON public.demand_comments
FOR INSERT
TO authenticated
WITH CHECK ((is_ai = false) AND (is_system = false) AND (auth.uid() = user_id));

DROP POLICY IF EXISTS "demand_comments_select_scoped" ON public.demand_comments;
CREATE POLICY "demand_comments_select_scoped"
ON public.demand_comments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (user_id = auth.uid())
  OR (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_comments.demand_id
        AND (d.created_by = auth.uid() OR d.assigned_to = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Author updates own comments" ON public.demand_comments;
CREATE POLICY "Author updates own comments"
ON public.demand_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_system = false)
WITH CHECK (auth.uid() = user_id AND is_system = false);

DROP POLICY IF EXISTS "Author deletes own comments" ON public.demand_comments;
CREATE POLICY "Author deletes own comments"
ON public.demand_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND is_system = false);