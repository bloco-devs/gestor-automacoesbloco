
-- 1) Backfill: relink solicitacoes to the auth user whose email matches
UPDATE public.solicitacoes s
SET user_id = u.id
FROM auth.users u
WHERE lower(s.email) = lower(u.email)
  AND s.user_id IS DISTINCT FROM u.id;

-- 2) Update handle_new_user to also relink existing solicitacoes by email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Relink any solicitacoes registered with this email to the new user
  UPDATE public.solicitacoes
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS DISTINCT FROM NEW.id;

  RETURN NEW;
END;
$function$;
