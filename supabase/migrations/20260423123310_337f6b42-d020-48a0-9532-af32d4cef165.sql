INSERT INTO public.allowed_emails (email)
VALUES ('blococcomercial@gmail.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'blococcomercial@gmail.com'
ON CONFLICT DO NOTHING;