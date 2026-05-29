-- Recriar FKs apontando para demanda_solucoes
ALTER TABLE public.solucao_diagrama_posicoes
  DROP CONSTRAINT solucao_diagrama_posicoes_solucao_id_fkey,
  ADD CONSTRAINT solucao_diagrama_posicoes_solucao_id_fkey
    FOREIGN KEY (solucao_id) REFERENCES public.demanda_solucoes(id) ON DELETE CASCADE;

ALTER TABLE public.solucao_diagrama_conexoes
  DROP CONSTRAINT solucao_diagrama_conexoes_source_id_fkey,
  ADD CONSTRAINT solucao_diagrama_conexoes_source_id_fkey
    FOREIGN KEY (source_id) REFERENCES public.demanda_solucoes(id) ON DELETE CASCADE;

ALTER TABLE public.solucao_diagrama_conexoes
  DROP CONSTRAINT solucao_diagrama_conexoes_target_id_fkey,
  ADD CONSTRAINT solucao_diagrama_conexoes_target_id_fkey
    FOREIGN KEY (target_id) REFERENCES public.demanda_solucoes(id) ON DELETE CASCADE;