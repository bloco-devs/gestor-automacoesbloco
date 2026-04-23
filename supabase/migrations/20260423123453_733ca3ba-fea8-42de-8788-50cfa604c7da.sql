UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'blococcomercial@gmail.com'
  AND email_confirmed_at IS NULL;