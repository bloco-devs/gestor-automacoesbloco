# FEATURE 026.4 — Panorama do Gestor + Insights Unificados

Status: implementado sob a feature flag `ux.rewrite` (default OFF).
Escopo: **composição pura**. Zero backend, zero migrations, zero edge functions,
zero alteração em motores (Workflow, AI SDK, Orchestrator, Plugin, Routing, Context).

## Objetivo

Eliminar a fragmentação da experiência do gestor. Antes existiam sete portas de
entrada com dados sobrepostos: Operations, Command Center, Analytics, Saúde,
Observability, Quality e Centro Operacional. Depois desta feature restam **quatro
áreas** para o dia a dia do gestor:

- **Panorama** — `/gestao/panorama` (home)
- **Equipe** — `/gestao/equipe`
- **Demandas** — `/gestao/demandas` (mesma tela do Workspace)
- **Insights** — `/gestao/insights` (analytics, saúde, IA, qualidade, observabilidade, plataforma e segurança como abas)

Command Center passa a ser modo expandido do Panorama. Operations passa a ser
provedor de dados (via `useOperationsData`). Copilot permanece lateral, nunca é
uma página.

## Arquitetura

```text
src/modules/manager-unified/
├── ManagerShell.tsx        # Header + tabs + slot + Copilot lateral togglável
├── ManagerCopilotPanel.tsx # Painel lateral leve (sempre disponível)
├── ManagerOverview.tsx     # Seção 1: Demandas críticas (useOperationsData)
├── ManagerQueue.tsx        # Seção 2: Fila em risco (SLA, sem responsável)
├── ManagerTeam.tsx         # Seção 3: Equipe (workloads existentes)
├── ManagerRisks.tsx        # Seção 4: Riscos (insights heurísticos locais)
├── InsightsTabs.tsx        # 7 abas de páginas EXISTENTES (nada duplicado)
└── index.ts
```

Páginas (composição fina):

```text
src/pages/gestao/
├── ManagerPanoramaPage.tsx  # Overview + Queue + Team + Risks
├── ManagerEquipePage.tsx    # ManagerTeam estendido
├── ManagerDemandasPage.tsx  # reutiliza WorkspaceDemandasPage
├── ManagerInsightsPage.tsx  # InsightsTabs
└── ManagerInboxPage.tsx     # reutiliza pages/Inbox
```

## Composição do Insights

| Aba              | Renderiza (página existente)                     |
| ---------------- | ------------------------------------------------ |
| Resumo           | `pages/admin/Analytics`                          |
| Operação         | `modules/operations/components/OperationsPage`   |
| IA               | `pages/ObservabilidadeIA`                        |
| Qualidade        | `modules/governance/GovernancePage`              |
| Observabilidade  | `pages/admin/ObservabilityCenter`                |
| Plataforma       | `pages/admin/PlatformHealth`                     |
| Segurança        | `pages/admin/SecurityCenter`                     |

Nenhuma tela é reimplementada.

## Fluxo de dados

Todas as seções do Panorama consomem **exclusivamente** `useOperationsData` do
módulo Operations. O hook já agrega demandas, workloads, insights heurísticos e
buckets de SLA a partir dos módulos existentes (`demands`, `dashboard`,
`notifications`). Nenhuma nova query, RPC, edge function ou tabela foi criada.

## Feature Flag

Toda a experiência está atrás de `ux.rewrite`:

- **OFF (default)**: `/gestao/*` redireciona para as telas antigas
  (`/command-center`, `/operacoes`, `/admin/demandas`, `/admin/analytics`,
  `/trabalho/inbox`). Comportamento atual preservado.
- **ON**: `/gestao/*` renderiza o novo shell + páginas de composição.

## Mapa de aliases (`ux.rewrite` ON)

| Rota antiga             | Rota canônica         |
| ----------------------- | --------------------- |
| `/command-center`       | `/gestao/panorama`    |
| `/operacoes`            | `/gestao/panorama`    |
| `/admin/analytics`      | `/gestao/insights`    |
| `/admin/saude`          | `/gestao/insights`    |
| `/admin/observability`  | `/gestao/insights`    |
| `/admin/quality`        | `/gestao/insights`    |
| `/admin/platform-health`| `/gestao/insights`    |
| `/trabalho/inbox`       | `/gestao/inbox`       |

Aliases são declarados no `UnifiedNavigationRegistry` (perfil `gestao`).

## Migração

1. Ligar `ux.rewrite` em ambiente controlado.
2. Validar Panorama, Equipe, Demandas, Insights e Inbox.
3. Comunicar equipe: os menus antigos passam a ser abas dentro de Insights.
4. Manter rotas antigas ativas indefinidamente como aliases — nenhuma URL quebra.

## Critérios de aceite

- [x] Panorama substitui Operations como home do gestor.
- [x] Command Center vira modo expandido do Panorama (mesmos dados via `useOperationsData`).
- [x] Analytics, Observability, Health, Quality, Security, Platform e IA viram abas de Insights.
- [x] Equipe possui página própria em `/gestao/equipe`.
- [x] Demandas reutiliza exatamente a mesma tela do Workspace (`WorkspaceDemandasPage`).
- [x] Copilot lateral, nunca uma página.
- [x] Flag `ux.rewrite` controla toda a experiência.
- [x] Zero backend, migrations, edge functions ou motores alterados.
- [x] Testes verdes: `ManagerShell`, `InsightsTabs`, aliases e feature flag.
