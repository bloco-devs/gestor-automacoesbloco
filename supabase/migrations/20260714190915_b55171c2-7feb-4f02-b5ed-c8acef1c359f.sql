-- RFC-001 Fase 2 — Guarda de transições de status
-- Aditivo: REPLACE apenas das RPCs criadas na Fase 1 do importador.

CREATE OR REPLACE FUNCTION public.atividades_import_job_update_progress(
  _job_id uuid, _progress jsonb, _status text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.atividades_import_jobs
     WHERE id = _job_id AND criado_por = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_current FROM public.atividades_import_jobs WHERE id = _job_id;

  IF _status IS NOT NULL THEN
    IF _status NOT IN ('queued','running','success','partial','failed','cancelled') THEN
      RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
    END IF;

    IF v_current IN ('success','partial','failed','cancelled') THEN
      RAISE EXCEPTION 'job in final state (%) cannot transition', v_current
        USING ERRCODE = '22023';
    END IF;

    IF NOT (
      (v_current = 'queued'  AND _status IN ('queued','running'))
      OR (v_current = 'running' AND _status = 'running')
    ) THEN
      RAISE EXCEPTION 'invalid status transition % -> %', v_current, _status
        USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.atividades_import_jobs
     SET progress    = COALESCE(_progress, progress),
         status      = COALESCE(_status, status),
         iniciado_em = COALESCE(iniciado_em, CASE WHEN _status = 'running' THEN now() END),
         updated_at  = now()
   WHERE id = _job_id;
END $function$;

CREATE OR REPLACE FUNCTION public.atividades_import_job_finalize(
  _job_id uuid, _status text, _report jsonb, _board_id_local uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current text;
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

  SELECT status INTO v_current FROM public.atividades_import_jobs WHERE id = _job_id;

  IF v_current IN ('success','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'job in final state (%) cannot be finalized again', v_current
      USING ERRCODE = '22023';
  END IF;

  IF NOT (
    (v_current = 'running' AND _status IN ('success','partial','failed','cancelled'))
    OR (v_current = 'queued'  AND _status IN ('cancelled','failed'))
  ) THEN
    RAISE EXCEPTION 'invalid status transition % -> %', v_current, _status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.atividades_import_jobs
     SET status         = _status,
         report         = COALESCE(_report, report),
         board_id_local = COALESCE(_board_id_local, board_id_local),
         concluido_em   = now(),
         updated_at     = now()
   WHERE id = _job_id;
END $function$;