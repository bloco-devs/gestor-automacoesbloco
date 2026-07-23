# FEATURE 027 · Onda 0 — Integration Audit

Auditoria conservadora e read-only do estado atual das integrações da plataforma.
Serve de fonte-de-verdade para as ondas 1–9 da FEATURE 027 (Enterprise Integration Hub).

## 1. Superfícies de integração já existentes

### 1.1 Edge Functions (Supabase — 21)

| Categoria | Funções |
|---|---|
| Autenticação / SSO | `sso-login`, `bloco-connect`, `provision-user` |
| Demandas / IA | `assistente-demanda`, `demand-triage`, `triagem-demanda`, `demand-ai-plan`, `demand-auto-responder`, `demandas-similares`, `confirmar-atendimento-existente`, `resumo-pipeline`, `reprocessar-matches`, `match-ecossistema` |
| Ecossistema / Mapa | `ecossistema-mapa`, `mapa-narrativa` |
| Importador | `importer-run`, `importer-upload` |
| Webhooks | `webhook-dispatch`, `webhook-test` |
| Bulk / Admin | `bulk-create-requesters` |

Todas usam `_shared/cors.ts`, `_shared/ia-gateway.ts` e `_shared/rate-limit.ts`.
Rate limit padrão: **20 req / 60s**. CORS restrito.

### 1.2 Service Mesh (`src/platform-sdk/services/`)

Contratos publicados via `service.*` (registro in-memory, versionado, com capability check).
Observáveis por `meshEventHistory()` e agregados por `collectMeshTimeline()`.

### 1.3 Webhooks internos

- Tabela `webhooks` (admin UI em `/admin/configuracoes/webhooks`).
- Dispatcher: edge function `webhook-dispatch` (retries + delivery log).
- Consumidor de teste: `webhook-test`.

### 1.4 Connectors

- **Externos** (via `standard_connectors`): Supabase (self), IA Gateway.
- **HUB Bloco ID**: `ecossistema-catalogo` (read-only, ref `yzuvwhszpyxchlejxsjd`).
- **Sienge**: leitura via conectores `comercial-leitura`, `obra-leitura` (fluxo já monitorado na Saúde do ecossistema).

### 1.5 SDKs oficiais

| SDK | Path | Diagnostics |
|---|---|---|
| Platform SDK | `src/platform-sdk/` | `pluginHost.diagnostics()` |
| AI SDK | `src/platform-sdk/ai-sdk/` | `collectAiSdkDiagnostics()` |
| Workflow SDK | `src/platform-sdk/workflow-sdk/` | `collectWorkflowSdkDiagnostics()` |
| Event SDK | `src/platform-sdk/event-sdk/` | `collectEventSdkDiagnostics()` |
| Orchestrator | `src/platform-sdk/orchestrator/` | `collectOrchestratorDiagnostics()` |
| Service Mesh | `src/platform-sdk/services/` | `meshEventHistory()`, `serviceMesh.registry.list()` |

### 1.6 Observability (feature 026)

Agregadores read-only (`src/modules/observability/`) — reutilizados por Developer Center e serão a base do Integration Hub.

## 2. Rotas HTTP internas (front)

Portal, Workspace, Operations, Analytics, Knowledge, Workflow, Routing, Ecossistema, Admin, Security, Observability, Studio, Developer.
Todas descritas em `docs/05-Arquitetura.md`; nenhuma exposta ao público como API.

## 3. Eventos de plataforma

- Event SDK: catálogo dinâmico por plugin (`collectEventSdkDiagnostics`).
- Service Mesh: eventos `provider.registered`, `consumer.resolved`, `capability.denied`, …
- Observability tracing: `spanHistory()` (ring buffer 500).

## 4. Lacunas identificadas (motivam a Feature 027)

1. **Falta visão unificada** de integrações — hoje o operador precisa saltar entre `/admin/observability`, `/admin/configuracoes/webhooks`, `/admin/marketplace`, `/developer/*`.
2. **Sem catálogo** legível por humano das APIs internas (edge functions + rotas de UI).
3. **Webhook Center** e **Connector Hub** existem parcialmente mas não têm um índice cross-cutting.
4. **SDK Explorer** só existe no Developer Center técnico — falta viés "integrador externo".
5. **Sem developer portal** com Markdown viewer dos docs de integração.

## 5. Diretrizes para as próximas ondas

- Todo o hub é **aditivo** e **read-only** — nenhuma migration, nenhuma edge function nova.
- Reutilizar 100% dos agregadores existentes.
- Usar DS 2.0 (`PageShell`, `PageHeader`, `StatCard`, `EmptyPanel`).
- Todas as páginas com `lazy()` + `Suspense` no `App.tsx`.
- Grupo de sidebar dedicado sob **Administração → Integrações**.
- Contratos públicos não podem ser modificados; consumidores apenas.
