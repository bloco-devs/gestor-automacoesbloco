delete from public.notificacoes where solicitacao_id is not null;
delete from public.demanda_tasks;
delete from public.solicitacoes_score_history;
delete from public.demanda_solucoes;
delete from public.solicitacoes;