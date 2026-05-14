alter table public.solicitacoes
  add column if not exists data_inicio_prevista date,
  add column if not exists data_fim_prevista date;

alter table public.demanda_solucoes
  add column if not exists data_inicio_prevista date,
  add column if not exists data_fim_prevista date;