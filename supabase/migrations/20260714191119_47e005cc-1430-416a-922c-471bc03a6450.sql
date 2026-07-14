-- RFC-001 Fase 2 — Guarda de transição também no cancel
-- Aditivo: REPLACE apenas da RPC de cancelamento do importador.
-- update_progress e finalize já foram protegidas em migração anterior.

CREATE OR REPLACE FUNCTION public.atividades_import_job_cancel(_job_id uuid)
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

  IF v_current IN ('success','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid import job status transition: % -> cancelled', v_current
      USING ERRCODE = '22023';
  END IF;

  IF v_current NOT IN ('queued','running') THEN
    RAISE EXCEPTION 'Invalid import job status transition: % -> cancelled', v_current
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.atividades_import_jobs
     SET status = 'cancelled',
         concluido_em = now(),
         updated_at = now()
   WHERE id = _job_id;
END $function$;