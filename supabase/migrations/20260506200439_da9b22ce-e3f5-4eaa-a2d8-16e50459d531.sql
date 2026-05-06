
-- 1) Restrict solicitacoes broad SELECT to admins only (PII protection)
DROP POLICY IF EXISTS "Allowed users can view all solicitacoes" ON public.solicitacoes;

-- 2) Enforce user_email on activity_log insert via trigger (cannot be spoofed)
CREATE OR REPLACE FUNCTION public.set_activity_log_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  SELECT email INTO NEW.user_email FROM auth.users WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_activity_log_user_email ON public.activity_log;
CREATE TRIGGER trg_set_activity_log_user_email
BEFORE INSERT ON public.activity_log
FOR EACH ROW EXECUTE FUNCTION public.set_activity_log_user_email();
