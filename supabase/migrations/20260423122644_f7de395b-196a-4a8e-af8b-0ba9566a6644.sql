-- 1) Remove activity_log from realtime publication to prevent broadcasting all rows to all subscribers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'activity_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_log';
  END IF;
END $$;

-- 2) Restrict allowed_emails SELECT to admins only
DROP POLICY IF EXISTS "Allowed users can view allowed_emails" ON public.allowed_emails;

CREATE POLICY "Only admins can view allowed_emails"
ON public.allowed_emails
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));