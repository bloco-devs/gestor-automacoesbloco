# 86 — Workspace Unificado (FEATURE 026.3)

**Status:** implementado. Aditivo. Protegido pela feature flag `ux.rewrite` (default **OFF**).

## Princípio

Existe apenas uma coisa para o desenvolvedor: **trabalhar nas demandas**. Todo o resto é apoio.

Ao ativar `ux.rewrite`, o desenvolvedor nunca precisa navegar entre Atividades, Sprint, Kanban, Gantt, Timeline, Dashboard ou Workspace — tudo passa a existir dentro de uma única casa: `/workspace/*`.

## Mapa

```
/workspace                → Hoje (3 colunas: fila | demanda ativa | copilot)
/workspace/demandas       → Página única com abas: Lista | Board | Sprint | Timeline | Gantt
/workspace/builder        → Abas: Workflow | Studio | Plugins | Marketplace | SDK
/workspace/devtools       → Developer Center (intacto internamente)
```

Sidebar do perfil `workspace` (fonte: `UnifiedNavigationRegistry`):

```
Workspace
  Hoje       → /workspace
  Demandas   → /workspace/demandas
  Builder    → /workspace/builder
  DevTools   → /workspace/devtools
  Inbox      → /trabalho/inbox     (comunicação, permanece separado)
```

## Aliases (compatibilidade)

| De | Para |
|---|---|
| `/atividades` | `/workspace/demandas?view=board` |
| `/solicitacoes`, `/solicitacoes/kanban`, `/kanban`, `/admin/demandas` | `/workspace/demandas` |
| `/admin/workflows`, `/studio` | `/workspace/builder` |
| `/developer` | `/workspace/devtools` |
| `/dashboard`, `/workspace/hoje` | `/workspace` |
| `/workspace/inbox` | `/trabalho/inbox` |

Quando `ux.rewrite` está **OFF**, todas as rotas antigas continuam apontando para as páginas originais — nenhuma funcionalidade é removida.

## Composição

Módulo `src/modules/workspace-unified/`:

| Arquivo | Papel |
|---|---|
| `WorkspaceShell.tsx` | Header + tabs (Hoje/Demandas/Builder/DevTools) + toggle do Copilot lateral. Persistência em `localStorage`. |
| `WorkspaceCopilotPanel.tsx` | Painel Copilot lateral. Camada leve, sempre disponível, nunca substitui uma tela. |
| `index.ts` | API pública. Reexporta `UxRewriteGate`. |

Páginas (`src/pages/workspace/`):

| Página | Reutiliza |
|---|---|
| `WorkspaceHomePage` | `DeveloperWorkspace` (lista + detalhe + inteligência). |
| `WorkspaceDemandasPage` | `Solicitacoes` (Lista/Sprint), `Kanban` (Board), `SolicitacoesGantt` (Timeline/Gantt). |
| `WorkspaceBuilderPage` | `admin/Workflows`, `Studio`, `developer/Plugins`, `MarketplacePage`, `admin/SdkSandbox`. |
| `WorkspaceDevToolsPage` | `DeveloperCenter` (intacto). |

## Regras de negócio respeitadas

- **Apenas um Kanban** — Board é uma visualização de `/workspace/demandas`. `Kanban` continua sendo a implementação única.
- **Sprint é visualização**, não página — reusa `Solicitacoes` com filtro/ordenação.
- **Gantt e Timeline** são abas, reutilizando `SolicitacoesGantt`.
- **Copilot é camada lateral** — nunca uma página principal.
- **Inbox continua separado** (`/trabalho/inbox`) — Workspace não mostra Inbox operacional.
- **DevTools intacta** — a estrutura `/developer/*` permanece; o Workspace apenas embute `DeveloperCenter` como aba.

## Fluxo de decisão

```
usuário → /workspace/*
  ├─ flag off → páginas legadas (DeveloperWorkspace, Kanban, Workflows...) via redirect
  └─ flag on  → WorkspaceShell → aba selecionada
```

## Persistência (localStorage)

- `workspace-unified:copilot:v1` — painel lateral aberto/fechado.
- (mantidos) `workspace:selectedId:v1`, `workspace:panels:left:v1`, `workspace:panels:right:v1` — do `DeveloperWorkspace` já existente.

## Restrições respeitadas

Zero alterações em: Workflow Engine, Routing Engine, Smart Routing, Knowledge, Analytics, Observability, SDK, Plugin Runtime, Marketplace, AI SDK, AI Orchestrator, Security, Database, Supabase, Edge Functions, Service Mesh, Context Engine.

Zero migrations. Zero edge functions. Zero backend novo.

## Migração

1. **026.3 (esta fase)** — composição + rotas gated + aliases + testes + documentação.
2. **026.4** — quando `ux.rewrite` for GA, remover redirects legados e apontar as rotas antigas diretamente para o Workspace.
