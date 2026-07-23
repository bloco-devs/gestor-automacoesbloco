# 66 — Secrets & Environment

Rota: `/admin/secrets` · Somente leitura.

Nunca exibe valores. Mostra apenas status por chave: **Configurado**, **Ausente**, **Inválido**.

Chaves auditadas: Supabase URL, Anon Key, OpenAI, Anthropic, Google, GitHub, Webhook Signing Secret, Storage, Realtime.

Todos os secrets sensíveis (OpenAI/Anthropic/Google/Webhook) vivem no painel do Supabase (Edge Function Secrets), nunca no frontend.
