# 76 — Platform Studio · Auditoria (Onda 0)

Feature 025. Documento de auditoria para o Platform Studio (`/studio`). Não altera código.

## Objetivo
Mapear os recursos reutilizáveis da plataforma que serão consumidos pelo Studio como *building blocks* de baixo código. O Studio é 100% aditivo: não modifica motores, contratos, banco, edge functions ou RLS.

## Recursos reutilizáveis

| Área | Módulo | Uso previsto no Studio |
|---|---|---|
| Design System 2.0 | `src/design-system/*` (PageShell, PageHeader, Section, Toolbar, StatCard, KpiRow, EmptyPanel) | Shell e blocos visuais do canvas |
| Componentes UI | `src/components/ui/*` (Button, Input, Card, Dialog, Table, Tabs, Sheet, Badge…) | Component Registry |
| Workflow SDK | `src/platform-sdk/workflow-sdk` | Workflow Studio (leitura) |
| Event SDK | `src/platform-sdk/event-sdk` | Preview de eventos, hooks |
| AI SDK | `src/platform-sdk/ai-sdk` | AI Studio (skills, prompts, agentes) |
| AI Orchestrator | `src/platform-sdk/ai-orchestrator` | Planner para geração assistida |
| Plugin SDK | `src/platform-sdk/plugins` | Plugin Studio, export de manifest |
| Service Mesh | `src/platform-sdk/services` | Bindings de dados dinâmicos |
| Context Engine | `src/modules/context` | Contexto de edição / preview |
| Routing (Smart) | `src/modules/routing` | Binding read-only |
| Knowledge | `src/modules/knowledge` | Binding read-only |
| Analytics | `src/modules/analytics` | Widgets prontos e binding |
| Dashboard | páginas + hooks operacionais | Templates iniciais |
| Portal / Workspace | `src/pages/Portal`, `DeveloperWorkspace` | Templates prontos |
| Feature Flags | `src/modules/platform-hardening/feature-flags` | Toggles no preview |
| Settings | `src/modules/platform-hardening/settings` | Configuração declarativa |
| Security | `src/modules/security` | Auditoria de export |

## Contratos preservados
- Nada exposto pelo Studio muta estado global sem ação explícita do usuário.
- Todos os SDKs consumidos via APIs públicas (`serviceMesh`, `workflowSdk`, `aiSdk`, etc.).
- Persistência do Studio: `localStorage` (`studio.v1.*`). Sem migrations.

## Fora do escopo
Workflow Engine, Marketplace, Portal, Workspace, Operations, Analytics, Command Center, Knowledge, Routing, Ecossistema, Supabase, Edge Functions, RLS.

## Ondas
0. Auditoria (este doc)
1. Studio Shell
2. Component Registry
3. Drag & Drop Canvas (undo/redo, snap, grid)
4. Property Inspector
5. Data Bindings (config-only)
6. AI Studio
7. Plugin Studio
8. Workflow Studio (read-only)
9. Preview Runtime (breakpoints + tema)
10. Export (manifest + snapshot + docs)
