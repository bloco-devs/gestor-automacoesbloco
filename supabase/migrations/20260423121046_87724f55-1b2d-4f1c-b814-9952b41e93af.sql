-- 1) Enum de papéis e tabela user_roles (separada de profiles para evitar escalonamento de privilégios)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para checagem de papel (evita recursão em policies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policies de user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 2) Tabela solicitacoes
CREATE TABLE public.solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,                          -- nullable: pedidos públicos podem não ter usuário logado
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  descricao text NOT NULL,
  tipo text,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitacoes_user_id ON public.solicitacoes (user_id);
CREATE INDEX idx_solicitacoes_status ON public.solicitacoes (status);
CREATE INDEX idx_solicitacoes_created_at ON public.solicitacoes (created_at DESC);

ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

-- INSERT público (anon e authenticated podem criar)
CREATE POLICY "Anyone can submit a solicitacao"
  ON public.solicitacoes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Se houver usuário logado, user_id deve ser o próprio (ou nulo);
    -- anon sempre passa (auth.uid() é null).
    user_id IS NULL OR user_id = auth.uid()
  );

-- SELECT: dono (auth.uid = user_id) OU admin
CREATE POLICY "Owners can view their solicitacoes"
  ON public.solicitacoes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all solicitacoes"
  ON public.solicitacoes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- UPDATE: dono OU admin
CREATE POLICY "Owners can update their solicitacoes"
  ON public.solicitacoes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all solicitacoes"
  ON public.solicitacoes
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DELETE restrito a admin (boa prática — não foi pedido, mas evita exclusões indevidas)
CREATE POLICY "Admins can delete solicitacoes"
  ON public.solicitacoes
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger de updated_at (reaproveita a função já existente)
CREATE TRIGGER trg_solicitacoes_updated_at
BEFORE UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();