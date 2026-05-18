
-- Atualiza o check constraint de allowed_emails.role para incluir 'administrador'
ALTER TABLE public.allowed_emails DROP CONSTRAINT IF EXISTS allowed_emails_role_check;
ALTER TABLE public.allowed_emails
  ADD CONSTRAINT allowed_emails_role_check
  CHECK (role IN ('requester', 'developer', 'builder', 'administrador'));

INSERT INTO public.allowed_emails (email, role, nome)
VALUES
  ('blococcomercial@gmail.com', 'administrador', 'Administrador'),
  ('riccellycivil@gmail.com',  'administrador', 'Administrador')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.user_roles(user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) IN ('blococcomercial@gmail.com', 'riccellycivil@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
