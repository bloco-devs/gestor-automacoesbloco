DROP POLICY IF EXISTS "Allowed users can view activity_log" ON public.activity_log;

CREATE POLICY "Users can view own activity_log"
ON public.activity_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity_log"
ON public.activity_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));