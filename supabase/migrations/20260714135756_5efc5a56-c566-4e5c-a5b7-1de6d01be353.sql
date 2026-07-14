
-- ============ Tabela de metadados ============
CREATE TABLE public.atividades_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.atividades_cards(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.atividades_boards(id) ON DELETE RESTRICT,
  storage_path text NOT NULL UNIQUE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 15728640),
  uploaded_by uuid NOT NULL,
  uploaded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_atividades_anexos_card ON public.atividades_anexos(card_id, created_at DESC);
CREATE INDEX idx_atividades_anexos_board ON public.atividades_anexos(board_id);

GRANT SELECT, INSERT, DELETE ON public.atividades_anexos TO authenticated;
GRANT ALL ON public.atividades_anexos TO service_role;

ALTER TABLE public.atividades_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anexos_select_allowed" ON public.atividades_anexos
  FOR SELECT TO authenticated
  USING (public.is_allowed_user());

CREATE POLICY "anexos_insert_self" ON public.atividades_anexos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_allowed_user() AND uploaded_by = auth.uid());

CREATE POLICY "anexos_delete_owner_or_admin" ON public.atividades_anexos
  FOR DELETE TO authenticated
  USING (
    public.is_allowed_user()
    AND (uploaded_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role))
  );

-- ============ Validação: MIME allowlist + max 20 por card ============
CREATE OR REPLACE FUNCTION public.validate_atividade_anexo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_allowed text[] := ARRAY[
    'image/png','image/jpeg','image/webp','image/gif','image/svg+xml',
    'application/pdf','text/plain','text/csv','text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
    'application/zip'
  ];
  v_email text;
BEGIN
  IF NOT (NEW.mime_type = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Tipo de arquivo não permitido: %', NEW.mime_type USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_count FROM public.atividades_anexos WHERE card_id = NEW.card_id;
  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Limite de 20 anexos por card atingido' USING ERRCODE = '22023';
  END IF;

  -- Preenche board_id e email a partir do contexto
  IF NEW.board_id IS NULL THEN
    SELECT board_id INTO NEW.board_id FROM public.atividades_cards WHERE id = NEW.card_id;
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  NEW.uploaded_by_email := v_email;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_atividade_anexo
BEFORE INSERT ON public.atividades_anexos
FOR EACH ROW EXECUTE FUNCTION public.validate_atividade_anexo();

-- ============ Log no histórico do card ============
CREATE OR REPLACE FUNCTION public.log_atividade_anexo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, entity, payload)
    VALUES (NEW.card_id, v_uid, v_email, 'anexo_adicionado', 'anexo',
      jsonb_build_object('filename', NEW.filename, 'size_bytes', NEW.size_bytes, 'mime_type', NEW.mime_type));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.atividades_atividade_log(card_id, user_id, user_email, tipo, entity, payload)
    VALUES (OLD.card_id, v_uid, v_email, 'anexo_removido', 'anexo',
      jsonb_build_object('filename', OLD.filename));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_log_atividade_anexo_ins
AFTER INSERT ON public.atividades_anexos
FOR EACH ROW EXECUTE FUNCTION public.log_atividade_anexo_change();

CREATE TRIGGER trg_log_atividade_anexo_del
AFTER DELETE ON public.atividades_anexos
FOR EACH ROW EXECUTE FUNCTION public.log_atividade_anexo_change();

-- ============ Policies em storage.objects para o bucket atividades-anexos ============
CREATE POLICY "atividades_anexos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'atividades-anexos' AND public.is_allowed_user());

CREATE POLICY "atividades_anexos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'atividades-anexos'
    AND public.is_allowed_user()
    AND owner = auth.uid()
  );

CREATE POLICY "atividades_anexos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'atividades-anexos'
    AND public.is_allowed_user()
    AND (owner = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role))
  );
