# src/core — Infraestrutura transversal

Fundação técnica da Sprint 0 (v26.5). Aditivo. Não substitui código existente.

Camadas:

- `flags/` — Feature flags tipadas, organizadas por categoria (kanban, dashboard, workflow, automation, ai, ux).
- `events/` — Event Bus tipado + catálogo de Domain Events versionados.
- `errors/` — Erros de aplicação estruturados (`AppError`, `NotFoundError`, `ForbiddenError`, `ValidationError`).
- `logging/` — Logger com níveis, prefixo por módulo, silêncio em produção.
- `security/` — Permission matrix e action policies (client-side; a fonte da verdade continua sendo RLS no Postgres).
- `cache/` — `MemoryCache`, `StorageCache` e adaptador `QueryCache` para TanStack Query.
- `constants/` — Constantes de plataforma (rotas, timeouts, limites).
- `config/` — Config runtime derivada de env.

Regras:

1. Nenhum arquivo em `src/core/*` pode importar de `src/modules/*`, `src/pages/*` ou `src/components/*`.
2. Pode ser importado por `src/domain/*`, `src/modules/*`, `src/hooks/*`, `src/pages/*`.
3. Sem side effects em import — inicialização explícita via `bootstrap`.
