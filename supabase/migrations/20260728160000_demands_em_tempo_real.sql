-- A tabela `demands` não emitia eventos de tempo real
--
-- SINTOMA
-- Na tela da demanda, o fio registrava "fulano assumiu a demanda" enquanto o
-- painel de Contexto insistia em "Responsável: Ninguém ainda" e o Blink dizia
-- "Ninguém assumiu". Parecia dado divergente entre três lugares; era a mesma
-- verdade, com dois dos lados parados no tempo.
--
-- CAUSA
-- `demand_comments` e `demand_audit_logs` foram publicadas na
-- `supabase_realtime` quando o Help Desk nasceu. `demands` — a tabela que
-- guarda responsável, status, prioridade e SLA — ficou de fora.
--
-- Isso também explica um comportamento antigo que ninguém tinha ligado à
-- causa: `useDemands` já se inscrevia em mudanças de `demands` desde sempre.
-- A inscrição existia, funcionava, e nunca recebeu um único evento — porque
-- não havia nada publicando do outro lado. A lista de demandas só atualizava
-- por refetch ou recarga de página.
--
-- O bloco condicional evita erro se a tabela já estiver publicada: rodar a
-- migração duas vezes não pode quebrar o deploy.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'demands'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.demands;
  END IF;
END
$$;

-- Sem isto, um UPDATE só carrega as colunas que mudaram. Quem escuta precisa
-- do registro inteiro para decidir o que fazer — e um filtro por `id` numa
-- linha incompleta simplesmente não casa.
ALTER TABLE public.demands REPLICA IDENTITY FULL;
