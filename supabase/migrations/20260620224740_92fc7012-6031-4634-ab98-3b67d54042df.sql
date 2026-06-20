CREATE TABLE IF NOT EXISTS public.bloco_connect_recursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_logico text UNIQUE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('leitura','escrita')),
  recurso text NOT NULL,
  colunas text[] NOT NULL DEFAULT '{}',
  chave text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.bloco_connect_recursos TO service_role;

ALTER TABLE public.bloco_connect_recursos ENABLE ROW LEVEL SECURITY;