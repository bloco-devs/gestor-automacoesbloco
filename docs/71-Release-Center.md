# 71 — Release Center

Rota: `/admin/release`.

Checklist automático de prontidão para produção. Verifica 19 itens: Typecheck, Vitest, Build, Plugins, SDK, Runtime, Service Mesh, Marketplace, Repository, AI, Routing, Knowledge, Analytics, Operations, Portal, Workspace, Ecossistema, Segurança (RLS), Documentação.

Score em % + selo **Production Ready** quando ≥ 95%.

Reutiliza `collectRuntimeHealth()` do Platform Health Center para status dinâmico.
