# 72 — Security Audit (FEATURE 024, Onda 0)

Auditoria conservadora do modelo de segurança **existente** antes de qualquer implementação. Nenhum código foi alterado nesta onda.

## Escopo
Autenticação · Autorização · Roles · Feature Flags · Secrets · Audit · Logs · Sessions · Plugins · IA · SDK · Service Mesh · Event Bus · Workflow SDK · Copilot · Marketplace.

## Modelo atual
- **Auth**: Bloco ID SSO via Supabase. `getSession()` protegido por `withTimeout(8s)` no boot.
- **Authorization**: RLS em todas as tabelas críticas + `has_role(uid, role)` security-definer. Roles em `user_roles` (tabela separada). Bypass admin apenas no client para rotas dev.
- **Feature Flags**: store client-side (`gab:feature-flags:v1`) com API isolada. Nenhuma flag hoje toca RLS.
- **Secrets**: sensíveis exclusivamente em Edge Function Secrets (painel Supabase). Frontend só recebe `VITE_SUPABASE_URL` e anon key.
- **Audit**: ring buffer in-memory 1000 eventos. `recordAudit()` chamado por consumidores que optaram.
- **Errors**: ring buffer 500. `window.error` + `unhandledrejection` anexados em `AppLayout` uma única vez.
- **Sessions**: sessão gerida por Supabase Auth. UI expõe apenas metadados locais.
- **Plugins**: Plugin Host valida manifest + dependências. Extension Host valida assinatura SHA-256.
- **IA**: gateway central via `_shared/ia-gateway.ts` com CORS restrito, rate-limit 20/60s e `ia_uso_log`.
- **SDK / Mesh / Event Bus / Workflow SDK**: contratos versionados. Consumers `optional` são tolerantes; `required` falham verbosamente.
- **Copilot / Marketplace**: consomem serviços via Service Mesh. Nenhum plugin importa outro diretamente.

## Score inicial (base para a Onda 10)
| Categoria | Score | Motivo |
| --- | ---: | --- |
| Authentication | 92 | SSO + timeout de boot. Falta MFA opcional. |
| Authorization | 90 | RLS + `has_role`. Falta multi-tenant real em `atividades_*`. |
| Secrets | 90 | Sensíveis fora do bundle. Falta rotação automática. |
| Observability | 92 | Errors + Audit + Threat + Mesh Diagnostics. |
| Compliance | 82 | LGPD/OWASP altos; SOC2/NIST parciais. |
| Auditability | 88 | Ring buffer + CSV. Sem persistência. |
| Hardening | 90 | FEATURE 023 concluída (Error/Audit/Perf/Release Centers). |

## O que **nunca** pode acontecer
- `service_role_key` no bundle.
- Tabela pública sem `ENABLE RLS + POLICY + GRANT` no mesmo migration.
- Plugin importar outro plugin diretamente.
- Payload de secret escrito em qualquer log/ring buffer.
- Recomendações de compliance viradas em promessas contratuais sem revisão jurídica.

## Riscos aceitos (v1)
- Feature Flags e Policies em `localStorage` até persistência Supabase entrar em uma feature dedicada.
- Threat Center in-memory (perde ao recarregar) — coerente com Errors/Audit.

## Fora de escopo desta feature
Edge functions · migrations · RLS · engines de Workflow/AI/Event/Mesh · contratos públicos.
