-- RFC-001 Fase 2 (refinamento) — máquina de estados + coerência temporal
-- Aditivo: substitui apenas as RPCs de progresso/finalize/cancel e adiciona trigger de imutabilidade.

CREATE OR REPLACE FUNCTION public.atividades_import_job_update_progress(
  _job_id uuid,
  _progress jsonb,
  _status text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.atividades_import_jobs
     WHERE id = _job_id AND criado_por = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_current
    FROM public.atividades_import_jobs
   WHERE id = _job_id;

  -- Estados finais são imutáveis
  IF v_current IN ('success','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'Import job is final (%); cannot update', v_current
      USING ERRCODE = '22023';
  END IF;

  -- Transições válidas quando _status é fornecido e difere do atual
  IF _status IS NOT NULL AND _status <> v_current THEN
    IF NOT (
      (v_current = 'queued'  AND _status = 'running') OR
      (v_current = 'queued'  AND _status = 'cancelled') OR
      (v_current = 'running' AND _status IN ('success','partial','failed','cancelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid import job status transition: % -> %', v_current, _status
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Mesmo status (ou NULL) = apenas atualização de progresso, não é transição
  UPDATE public.atividades_import_jobs
     SET progress     = COALESCE(_progress, progress),
         status       = COALESCE(_status, status),
         iniciado_em  = COALESCE(iniciado_em, CASE WHEN _status = 'running' THEN now() END),
         concluido_em = COALESCE(concluido_em,
                                 CASE WHEN _status IN ('success','partial','failed','cancelled')
                                      THEN now() END),
         updated_at   = now()
   WHERE id = _job_id;
END $$;

CREATE OR REPLACE FUNCTION public.atividades_import_job_finalize(
  _job_id uuid,
  _status text,
  _report jsonb,
  _board_id_local uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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

  SELECT status INTO v_current
    FROM public.atividades_import_jobs
   WHERE id = _job_id;

  IF v_current IN ('success','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'Import job is final (%); cannot finalize again', v_current
      USING ERRCODE = '22023';
  END IF;

  -- Finalização só é permitida a partir de 'running'.
  -- (queued -> cancelled é responsabilidade da RPC de cancel.)
  IF v_current <> 'running' THEN
    RAISE EXCEPTION 'Invalid import job status transition: % -> %', v_current, _status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.atividades_import_jobs
     SET status         = _status,
         report         = COALESCE(_report, report),
         board_id_local = COALESCE(_board_id_local, board_id_local),
         concluido_em   = COALESCE(concluido_em, now()),
         updated_at     = now()
   WHERE id = _job_id;
END $$;

CREATE OR REPLACE FUNCTION public.atividades_import_job_cancel(_job_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.atividades_import_jobs
     WHERE id = _job_id AND criado_por = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_current
    FROM public.atividades_import_jobs
   WHERE id = _job_id;

  IF v_current IN ('success','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid import job status transition: % -> cancelled', v_current
      USING ERRCODE = '22023';
  END IF;

  IF v_current NOT IN ('queued','running') THEN
    RAISE EXCEPTION 'Invalid import job status transition: % -> cancelled', v_current
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.atividades_import_jobs
     SET status       = 'cancelled',
         concluido_em = COALESCE(concluido_em, now()),
         updated_at   = now()
   WHERE id = _job_id;
END $$;

-- Trigger de imutabilidade dos timestamps de auditoria e do estado final
CREATE OR REPLACE FUNCTION public.atividades_import_jobs_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- iniciado_em imutável depois de definido
  IF OLD.iniciado_em IS NOT NULL AND NEW.iniciado_em IS DISTINCT FROM OLD.iniciado_em THEN
    RAISE EXCEPTION 'iniciado_em is immutable once set' USING ERRCODE = '22023';
  END IF;

  -- concluido_em imutável depois de definido
  IF OLD.concluido_em IS NOT NULL AND NEW.concluido_em IS DISTINCT FROM OLD.concluido_em THEN
    RAISE EXCEPTION 'concluido_em is immutable once set' USING ERRCODE = '22023';
  END IF;

  -- Estados finais são imutáveis
  IF OLD.status IN ('success','partial','failed','cancelled')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Import job in final status (%) cannot change to %', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS atividades_import_jobs_guard_trg ON public.atividades_import_jobs;
CREATE TRIGGER atividades_import_jobs_guard_trg
  BEFORE UPDATE ON public.atividades_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.atividades_import_jobs_guard();