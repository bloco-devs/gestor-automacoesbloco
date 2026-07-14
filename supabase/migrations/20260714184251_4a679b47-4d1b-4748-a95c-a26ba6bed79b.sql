
-- ============================================================
-- RFC-001 — Importador de Quadros (Fase 1: Infraestrutura)
-- 100% aditivo. Nada existente é alterado.
-- ============================================================

-- ------------------------------------------------------------
-- 1) atividades_import_jobs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atividades_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_por uuid NOT NULL,
  board_id_local uuid REFERENCES public.atividades_boards(id) ON DELETE SET NULL,
  source text NOT NULL,
  adapter_version text NOT NULL,
  snapshot_version text NOT NULL,
  runner_version text NOT NULL,
  target_mode text NOT NULL CHECK (target_mode IN ('create_board','existing_board')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','success','partial','failed','cancelled')),
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolutions jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_hash text,
  file_name text,
  file_size bigint,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_criado_por ON public.atividades_import_jobs(criado_por);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status     ON public.atividades_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_board      ON public.atividades_import_jobs(board_id_local);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created    ON public.atividades_import_jobs(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.atividades_import_jobs TO authenticated;
GRANT ALL ON public.atividades_import_jobs TO service_role;

ALTER TABLE public.atividades_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_jobs_select_owner_or_board_admin"
  ON public.atividades_import_jobs FOR SELECT
  TO authenticated
  USING (
    criado_por = auth.uid()
    OR (board_id_local IS NOT NULL AND public.atividades_can_admin_board(board_id_local))
  );

CREATE POLICY "import_jobs_insert_self"
  ON public.atividades_import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (criado_por = auth.uid());

CREATE POLICY "import_jobs_update_owner"
  ON public.atividades_import_jobs FOR UPDATE
  TO authenticated
  USING (criado_por = auth.uid())
  WITH CHECK (criado_por = auth.uid());

CREATE TRIGGER trg_atividades_import_jobs_updated_at
  BEFORE UPDATE ON public.atividades_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime somente para esta nova tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_import_jobs;

-- ------------------------------------------------------------
-- 2) atividades_import_member_map
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atividades_import_member_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_member_id text NOT NULL,
  source_username text,
  target_user_id uuid,
  strategy text NOT NULL CHECK (strategy IN ('map','ignore','history')),
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_member_id, criado_por)
);

CREATE INDEX IF NOT EXISTS idx_import_member_map_owner_source
  ON public.atividades_import_member_map(source, source_member_id, criado_por);

GRANT SELECT, INSERT, UPDATE ON public.atividades_import_member_map TO authenticated;
GRANT ALL ON public.atividades_import_member_map TO service_role;

ALTER TABLE public.atividades_import_member_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_member_map_select_own"
  ON public.atividades_import_member_map FOR SELECT
  TO authenticated
  USING (criado_por = auth.uid());

CREATE POLICY "import_member_map_insert_own"
  ON public.atividades_import_member_map FOR INSERT
  TO authenticated
  WITH CHECK (criado_por = auth.uid());

CREATE POLICY "import_member_map_update_own"
  ON public.atividades_import_member_map FOR UPDATE
  TO authenticated
  USING (criado_por = auth.uid())
  WITH CHECK (criado_por = auth.uid());

CREATE TRIGGER trg_atividades_import_member_map_updated_at
  BEFORE UPDATE ON public.atividades_import_member_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 3) atividades_import_entities
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atividades_import_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.atividades_import_jobs(id) ON DELETE CASCADE,
  source text NOT NULL,
  entity_type text NOT NULL
    CHECK (entity_type IN ('board','list','card','label','checklist','checklist_item','comment','attachment','member')),
  external_id text NOT NULL,
  local_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, entity_type, external_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_import_entities_job         ON public.atividades_import_entities(job_id);
CREATE INDEX IF NOT EXISTS idx_import_entities_entity_type ON public.atividades_import_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_import_entities_external_id ON public.atividades_import_entities(external_id);

-- authenticated: apenas SELECT. INSERT/UPDATE apenas pelo Runner (service_role).
GRANT SELECT ON public.atividades_import_entities TO authenticated;
GRANT ALL ON public.atividades_import_entities TO service_role;

ALTER TABLE public.atividades_import_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_entities_select_by_job_owner_or_board_admin"
  ON public.atividades_import_entities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.atividades_import_jobs j
      WHERE j.id = job_id
        AND (
          j.criado_por = auth.uid()
          OR (j.board_id_local IS NOT NULL AND public.atividades_can_admin_board(j.board_id_local))
        )
    )
  );

-- ============================================================
-- RPCs novas (SECURITY DEFINER, search_path = public)
-- ============================================================

CREATE OR REPLACE FUNCTION public.atividades_import_job_create(
  _source text,
  _target_mode text,
  _options jsonb,
  _file_hash text,
  _file_name text,
  _file_size bigint,
  _adapter_version text,
  _snapshot_version text,
  _runner_version text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_allowed_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _target_mode NOT IN ('create_board','existing_board') THEN
    RAISE EXCEPTION 'invalid target_mode' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.atividades_import_jobs (
    criado_por, source, adapter_version, snapshot_version, runner_version,
    target_mode, options, file_hash, file_name, file_size
  ) VALUES (
    auth.uid(), _source, _adapter_version, _snapshot_version, _runner_version,
    _target_mode, COALESCE(_options, '{}'::jsonb), _file_hash, _file_name, _file_size
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.atividades_import_job_update_progress(
  _job_id uuid,
  _progress jsonb,
  _status text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.atividades_import_jobs
     WHERE id = _job_id AND criado_por = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _status IS NOT NULL AND _status NOT IN ('queued','running','success','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.atividades_import_jobs
     SET progress    = COALESCE(_progress, progress),
         status      = COALESCE(_status, status),
         iniciado_em = COALESCE(iniciado_em, CASE WHEN _status = 'running' THEN now() END),
         updated_at  = now()
   WHERE id = _job_id;
END $$;

CREATE OR REPLACE FUNCTION public.atividades_import_job_cancel(_job_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.atividades_import_jobs
     WHERE id = _job_id AND criado_por = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.atividades_import_jobs
     SET status = 'cancelled', updated_at = now()
   WHERE id = _job_id AND status IN ('queued','running');
END $$;

CREATE OR REPLACE FUNCTION public.atividades_import_job_finalize(
  _job_id uuid,
  _status text,
  _report jsonb,
  _board_id_local uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('success','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.atividades_import_jobs
     WHERE id = _job_id AND criado_por = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.atividades_import_jobs
     SET status         = _status,
         report         = COALESCE(_report, report),
         board_id_local = COALESCE(_board_id_local, board_id_local),
         concluido_em   = now(),
         updated_at     = now()
   WHERE id = _job_id;
END $$;

CREATE OR REPLACE FUNCTION public.atividades_import_entity_register(
  _job_id uuid,
  _entity_type text,
  _external_id text,
  _local_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_source text; v_local uuid;
BEGIN
  SELECT source INTO v_source FROM public.atividades_import_jobs
   WHERE id = _job_id AND criado_por = auth.uid();
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _entity_type NOT IN ('board','list','card','label','checklist','checklist_item','comment','attachment','member') THEN
    RAISE EXCEPTION 'invalid entity_type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.atividades_import_entities (job_id, source, entity_type, external_id, local_id)
  VALUES (_job_id, v_source, _entity_type, _external_id, _local_id)
  ON CONFLICT (source, entity_type, external_id, job_id) DO UPDATE
    SET local_id = COALESCE(public.atividades_import_entities.local_id, EXCLUDED.local_id)
  RETURNING local_id INTO v_local;

  RETURN v_local;
END $$;

CREATE OR REPLACE FUNCTION public.atividades_import_entity_get(
  _job_id uuid,
  _entity_type text,
  _external_id text
) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.local_id
    FROM public.atividades_import_entities e
    JOIN public.atividades_import_jobs j ON j.id = e.job_id
   WHERE e.job_id = _job_id
     AND e.entity_type = _entity_type
     AND e.external_id = _external_id
     AND (
       j.criado_por = auth.uid()
       OR (j.board_id_local IS NOT NULL AND public.atividades_can_admin_board(j.board_id_local))
     )
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.atividades_import_member_map_upsert(
  _source text,
  _source_member_id text,
  _source_username text,
  _strategy text,
  _target_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF _strategy NOT IN ('map','ignore','history') THEN
    RAISE EXCEPTION 'invalid strategy' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.atividades_import_member_map (
    source, source_member_id, source_username, target_user_id, strategy, criado_por
  ) VALUES (
    _source, _source_member_id, _source_username, _target_user_id, _strategy, auth.uid()
  )
  ON CONFLICT (source, source_member_id, criado_por) DO UPDATE
    SET source_username = EXCLUDED.source_username,
        target_user_id  = EXCLUDED.target_user_id,
        strategy        = EXCLUDED.strategy,
        updated_at      = now();
END $$;

CREATE OR REPLACE FUNCTION public.atividades_import_member_map_list(_source text DEFAULT NULL)
RETURNS TABLE (
  source text,
  source_member_id text,
  source_username text,
  target_user_id uuid,
  strategy text,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT source, source_member_id, source_username, target_user_id, strategy, updated_at
    FROM public.atividades_import_member_map
   WHERE criado_por = auth.uid()
     AND (_source IS NULL OR source = _source)
   ORDER BY updated_at DESC;
$$;
