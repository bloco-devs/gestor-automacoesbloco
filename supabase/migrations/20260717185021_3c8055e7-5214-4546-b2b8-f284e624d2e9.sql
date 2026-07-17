
ALTER TABLE public.atividades_cards REPLICA IDENTITY FULL;
ALTER TABLE public.atividades_colunas REPLICA IDENTITY FULL;
ALTER TABLE public.atividades_card_labels REPLICA IDENTITY FULL;
ALTER TABLE public.atividades_labels REPLICA IDENTITY FULL;
ALTER TABLE public.atividades_comentarios REPLICA IDENTITY FULL;
ALTER TABLE public.atividades_atividade_log REPLICA IDENTITY FULL;
ALTER TABLE public.atividades_anexos REPLICA IDENTITY FULL;
ALTER TABLE public.atividades_label_favoritos REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='atividades_anexos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_anexos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='atividades_label_favoritos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_label_favoritos;
  END IF;
END $$;
