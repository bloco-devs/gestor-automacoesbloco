ALTER TABLE public.solucao_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.solucao_tasks;