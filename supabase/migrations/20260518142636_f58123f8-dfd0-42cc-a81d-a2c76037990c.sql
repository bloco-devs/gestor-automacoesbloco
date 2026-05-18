
CREATE OR REPLACE FUNCTION public.sync_allowed_email_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = NEW.email LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.role IN ('developer', 'administrador') THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (v_uid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'::app_role;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.solicitacoes
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS DISTINCT FROM NEW.id;

  SELECT role INTO v_role
  FROM public.allowed_emails
  WHERE email = lower(NEW.email);

  IF v_role IN ('developer', 'administrador') THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END $function$;
