ALTER TABLE public.demanda_solucoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.demanda_solucoes;