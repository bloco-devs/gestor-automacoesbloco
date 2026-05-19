
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  solicitacao_id uuid,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  lida_em timestamptz,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacoes_user_unread ON public.notificacoes (user_id, lida, created_at DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notificacoes"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notificacoes"
  ON public.notificacoes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notificacoes"
  ON public.notificacoes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notificacoes"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Trigger function: cria notificação quando avaliação técnica muda
CREATE OR REPLACE FUNCTION public.notify_avaliacao_tecnica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF (NEW.complexidade_dev IS DISTINCT FROM OLD.complexidade_dev)
     OR (NEW.notas_tecnicas_complexidade IS DISTINCT FROM OLD.notas_tecnicas_complexidade) THEN

    -- Não notificar se o próprio solicitante fez a mudança
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
      RETURN NEW;
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

    INSERT INTO public.notificacoes (
      user_id, tipo, solicitacao_id, titulo, mensagem, created_by, created_by_email
    ) VALUES (
      NEW.user_id,
      'avaliacao_tecnica',
      NEW.id,
      COALESCE(NULLIF(NEW.titulo, ''), 'Sua solicitação'),
      'Sua solicitação recebeu uma avaliação técnica.',
      auth.uid(),
      v_email
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_avaliacao_tecnica
AFTER UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.notify_avaliacao_tecnica();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
