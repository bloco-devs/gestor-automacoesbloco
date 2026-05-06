ALTER TABLE public.demanda_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.demanda_tasks;