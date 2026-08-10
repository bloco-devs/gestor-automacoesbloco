CREATE OR REPLACE FUNCTION public.demand_auto_reply_triagem(_demand_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _texto text := 'Olá! A sua demanda ainda se encontra na nossa fila de triagem. A nossa equipa está a analisar a solicitação e em breve um responsável será atribuído para iniciar o atendimento.';
  _id uuid;
  _ultima record;
BEGIN
  -- só responde se quem pede pode ver a demanda e ela ainda não tem responsável
  IF NOT EXISTS (
    SELECT 1 FROM public.demands d
    WHERE d.id = _demand_id
      AND d.assigned_to IS NULL
      AND (
        d.created_by = auth.uid()
        OR d.assigned_to = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.is_equipe()
      )
  ) THEN
    RETURN NULL;
  END IF;

  -- antispam: se a última mensagem do fio já é este mesmo aviso, não repete
  SELECT c.content, c.is_system INTO _ultima
  FROM public.demand_comments c
  WHERE c.demand_id = _demand_id
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF _ultima.is_system AND _ultima.content = _texto THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.demand_comments (demand_id, user_id, content, is_internal, is_ai, is_system)
  VALUES (_demand_id, NULL, _texto, false, false, true)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.demand_auto_reply_triagem(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demand_auto_reply_triagem(uuid) TO authenticated;