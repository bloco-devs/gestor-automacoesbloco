# Segurança

## Índice
- [Princípios](#princípios)
- [Autenticação](#autenticação)
- [Autorização e RLS](#autorização-e-rls)
- [Edge Functions](#edge-functions)
- [Storage](#storage)
- [Rate limit](#rate-limit)
- [Segredos](#segredos)
- [Validação e sanitização](#validação-e-sanitização)
- [Auditoria](#auditoria)

## Princípios
- Zero confiança no cliente: toda regra crítica vive no banco ou em edge function.
- Score, status e avaliação técnica são **imutáveis** para não-admins (trigger).
- IA é telemetrada 100% (`ia_uso_log`).

## Autenticação
- Supabase Auth (JWT curto + refresh) com `persistSession=true`.
- SSO Bloco ID via edge `sso-login` + `bloco-connect`.
- Recuperação de senha: fluxo isolado (`RecoveryGuard`, `isPasswordRecoveryIntent`), sem carregar profile para evitar redirect de role.
- Timeouts defensivos no boot (`withTimeout(getSession, 8000)`).

## Autorização e RLS
- Funções canônicas:
  - `is_allowed_user()` — usuário na whitelist.
  - `has_role(uid, role)` — SECURITY DEFINER, sem recursão em `user_roles`.
  - `get_my_role()` — retorna string do `allowed_emails`.
- Policies escopam por `auth.uid()` + `has_role(...)` + `is_allowed_user()`.
- Auditoria conservadora documentada em `docs/RLS_AUDIT.md`.
- Endurecimento por board em `atividades_*` está no backlog (ver Roadmap).

## Edge Functions
- `verify_jwt = true` em todas as funções chamadas pelo app (menos SSO).
- CORS restrito (helper em `_shared/cors.ts`).
- Payload validado antes de qualquer efeito colateral.
- Nunca expõem `service_role_key` ao browser.

## Storage
- Bucket `atividades-capas` privado; acesso via URL assinada com TTL curto.
- Cache de URL em `sessionStorage` para performance; fallback a URL pública em `BoardCard` quando assinada falha.
- Upload valida mime type (whitelist) e limita 20 anexos por card.

## Rate limit
- 20 req / 60s por usuário em funções de IA (`_shared/rate-limit.ts`).
- 429 propagado ao cliente para exibição de mensagem amigável.

## Segredos
- Painel Supabase (Edge Function Secrets) é a fonte oficial.
- Não gravar chaves em tabelas nem em variáveis do build front.
- `.env` do front contém apenas `VITE_SUPABASE_URL` e a `PUBLISHABLE_KEY` (anon).

## Validação e sanitização
- `zod` para formulários no front.
- `react-markdown` + `rehype-sanitize` para conteúdo user-generated.
- Triggers em banco reforçam invariantes (mime, quantidade, transições de status).

## Auditoria
- Tabelas: `activity_log`, `solicitacoes_score_history`, `atividades_atividade_log`, `atividades_board_historico`.
- Log de IA em `ia_uso_log`.
- Painel `/observabilidade-ia` para dev/admin.
