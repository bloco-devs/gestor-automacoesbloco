-- Onda B5 — agendamento (best-effort) para reprocessar matches do ecossistema.
-- Habilita as extensions necessárias. Idempotente.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- NOTA: NÃO agendamos o job automaticamente nesta migration porque a chamada
-- exige o SUPABASE_SERVICE_ROLE_KEY no header Authorization, e segredos não
-- devem viver em SQL versionado. Para ativar o cron diário (03:00 UTC),
-- um administrador pode rodar no SQL editor (substituindo <SERVICE_ROLE_KEY>):
--
--   select cron.schedule(
--     'reprocessar-matches-diario',
--     '0 3 * * *',
--     $cron$
--       select net.http_post(
--         url := 'https://cgbhpenkytibgiosksrb.supabase.co/functions/v1/reprocessar-matches',
--         headers := jsonb_build_object(
--           'Content-Type','application/json',
--           'Authorization','Bearer <SERVICE_ROLE_KEY>'
--         ),
--         body := '{}'::jsonb
--       );
--     $cron$
--   );
--
-- Enquanto o cron não estiver ativo, o botão "Reprocessar pendentes (IA)"
-- em /consolidacao executa a mesma rotina sob demanda.
