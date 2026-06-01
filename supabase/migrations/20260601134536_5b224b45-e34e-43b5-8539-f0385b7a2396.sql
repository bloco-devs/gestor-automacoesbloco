ALTER TABLE public.solucao_diagrama_conexoes
  ADD COLUMN IF NOT EXISTS curvatura_x double precision,
  ADD COLUMN IF NOT EXISTS curvatura_y double precision;