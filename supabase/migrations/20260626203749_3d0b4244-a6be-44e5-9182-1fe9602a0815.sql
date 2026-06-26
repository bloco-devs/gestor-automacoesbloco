
CREATE TABLE IF NOT EXISTS public.ia_uso_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao text,
  modelo text,
  tokens_in int,
  tokens_out int,
  status text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ia_uso_log_user_created_idx
  ON public.ia_uso_log (user_id, created_at DESC);

GRANT SELECT ON public.ia_uso_log TO authenticated;
GRANT ALL ON public.ia_uso_log TO service_role;

ALTER TABLE public.ia_uso_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ia_uso_log'
      AND policyname = 'ia_uso_log_select_admin_or_owner'
  ) THEN
    CREATE POLICY ia_uso_log_select_admin_or_owner
      ON public.ia_uso_log
      FOR SELECT
      TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR user_id = auth.uid()
      );
  END IF;
END $$;
