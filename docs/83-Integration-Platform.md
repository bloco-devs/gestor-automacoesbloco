# FEATURE 027 · Integration Platform

Camada oficial de integrações da plataforma. Aditiva, read-only, DS 2.0.

## Arquitetura

```
UI (/admin/integrations/*)
        │
        ▼
src/modules/integrations/        (dados agregados, read-only)
        │
        ├── observability aggregators
        ├── platform-health
        ├── service mesh diagnostics
        ├── plugin host + SDKs (AI, Workflow, Event, Orchestrator)
        └── catálogos estáticos (edge functions, API catalog, connectors, docs)
```

Não há novo backend, tabelas, migrations ou edge functions. A camada
apenas **consolida** superfícies pré-existentes.

## Fluxo do operador

1. Entra em `/admin/integrations` → visão geral (KPIs + navegação).
2. Escolhe a lente:
   - `/apis` — endpoints edge.
   - `/webhooks` — telemetria de entrega.
   - `/connectors` — catálogo externo (Supabase, OpenAI, Slack, …).
   - `/mesh` — contratos e providers do Service Mesh.
   - `/sdk` — plugins, comandos, widgets, skills.
   - `/catalog` — inventário por domínio (Portal, Workspace, IA, …).
   - `/diagnostics` — timeouts, retries, health score, latência.
   - `/docs` — índice pesquisável do Developer Portal.

## Boas práticas

- Todo novo painel de integração deve entrar como página lazy sob
  `/admin/integrations/*` e reutilizar `IntegrationShell`.
- Consumir dados **exclusivamente** via `@/modules/integrations` (fachada),
  para manter a camada isolada de mudanças upstream em observability/mesh.
- Nenhuma escrita nesta camada. Ações destrutivas continuam em suas
  telas de origem (`/admin/configuracoes/webhooks`, `/admin/marketplace`).
- Ao adicionar uma edge function nova, incluir entrada em
  `edgeFunctions.ts` e um doc em `docs/` (com summary no
  `developerDocs.ts`).

## Roadmap

- **Curto prazo**: adicionar métricas reais de webhook (delivery log via
  React Query cache) — hoje ainda usa seed local.
- **Médio prazo**: expor contract-tests do Service Mesh nesta camada.
- **Longo prazo**: portal externo com OpenAPI publicado + rate-limit
  aware SDK client.

## Checklist de aceite

- [x] Typecheck limpo
- [x] Zero regressão nos testes existentes
- [x] Módulo isolado em `src/modules/integrations/`
- [x] Nenhuma tabela, migration ou edge function nova
- [x] Nenhuma alteração em contratos públicos
- [x] Documentação em `docs/82` (auditoria) e `docs/83` (esta especificação)
- [x] Rotas lazy e sidebar dedicada
- [x] Reutilização máxima da infraestrutura existente
