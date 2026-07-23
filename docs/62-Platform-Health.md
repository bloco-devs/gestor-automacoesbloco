# 62 — Platform Health Center

Rota: `/admin/platform` · Role: `developer`.

Painel somente-leitura com três seções (DS 2.0):

- **Runtime** — status verde/âmbar/vermelho consolidado de Plugin Host, AI Runtime, Workflow Runtime, Event Runtime, SDK Runtime, Service Mesh e Repository. Fonte: `collectRuntimeHealth()` em `src/modules/platform-health/`.
- **Performance** — médias, P95 e P99 por camada (Render, Queries, Realtime, Workflow, Routing, Knowledge, IA e Mesh medido). Fonte: `collectPerformance()` — deriva latência real do Service Mesh via `meshEventHistory()`.
- **Sistema** — build, versão, commit, ambiente e versões de SDK/Plugin/Host.

Nenhum polling. Nenhum backend novo. Sem alteração de contratos.
