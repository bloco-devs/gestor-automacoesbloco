# 42 — Analytics Intelligence

Módulo **read-only** que transforma dados já existentes em inteligência
operacional. Ativo em `/admin/analytics`, acessível a `developer` e `admin`.

## Filosofia

- Reutilização máxima: nenhuma nova tabela, nenhuma nova edge function,
  nenhuma migration, nenhuma alteração de RLS.
- Agregações puras em memória, testáveis 100% offline.
- Cada seção consome exclusivamente APIs e módulos já em produção.
- Zero alteração em regras de negócio (Workflow Engine, AI Workspace,
  Portal, Developer Workspace, Routing, Knowledge, Context Engine,
  Platform Layer, UX Layer).

## Estrutura

```
src/modules/analytics/
  components/     seções visuais (uma por bloco da página)
  hooks/          useAnalyticsData — orquestra fontes existentes
  services/       analytics-service.ts (agregações puras)
  types/          contratos TS
  utils/          csv.ts (exportação/impressão)
  __tests__/      cobertura das agregações
```

`src/pages/admin/Analytics.tsx` é um _thin wrapper_: apenas reexporta
`AnalyticsPage` do módulo.

## Fontes de dados (todas reutilizadas)

| Seção                | Fonte                                                                 |
|----------------------|-----------------------------------------------------------------------|
| Resumo executivo     | `listDemands`, `getUserWorkloads`, `fetchIaUsage`, `knowledge_articles`, `knowledge_feedback`, `workflow_execution_logs` |
| Tendência            | `listDemands` (bucketização temporal em memória)                      |
| Produtividade equipe | `listDemands` + `getUserWorkloads` + `getProfilesByIds`               |
| Sistemas             | `listDemands` + `plataformas` (select `id, nome`)                     |
| Smart Routing        | `getUserWorkloads` + `buildCandidatePool` (módulo Routing)            |
| Workflow             | `listWorkflows` + `listActiveWorkflows` + `listRecentLogs`            |
| Knowledge            | `knowledge_articles` (published, views desc) + `knowledge_feedback`   |
| IA                   | `fetchIaUsage` + `aggregateIaUsage` (`src/lib/iaUsage.ts`)            |
| SLA                  | derivado de `listDemands` (sla_status, timestamps, priority)          |
| Insights             | `buildInsights` — Insights Engine do Centro de Operações              |

## Hooks / serviços reutilizados

- `@/modules/demands/service`: `listDemands`, `getUserWorkloads`, `getProfilesByIds`
- `@/modules/workflow-runtime/service`: `listRecentLogs`, `listWorkflows`, `listActiveWorkflows`
- `@/modules/routing/services/routing-service`: `buildCandidatePool`
- `@/modules/operations`: `buildInsights`
- `@/lib/iaUsage`: `fetchIaUsage`, `aggregateIaUsage`

## Componentes reutilizados

- Design System 2.0: `PageShell`, `PageHeader`, `Section`, `Toolbar`,
  `StatCard`, `KpiRow`, `EmptyPanel`
- shadcn: `Card`, `Button`, `Select`, `Avatar`
- `recharts` (Line, Area, Bar) — já presente no bundle

## Componentes novos

- `AnalyticsFiltersBar` — barra de filtros globais
- `ExecutiveSummary`, `TrendSection`, `TeamProductivity`, `SystemsRanking`,
  `RoutingSection`, `WorkflowSection`, `KnowledgeSection`, `AISection`,
  `SLASection`, `InsightsSection`
- `AnalyticsPage` — orquestrador

## Filtros globais

`AnalyticsFilters`: `period` (7d/30d/90d), `systemId`, `assignedTo`,
`priority`, `type`, `status`. Aplicados client-side em cima do resultado
de `listDemands` — nenhum novo endpoint.

## Performance

- Todas as queries usam `useQuery` com `staleTime` (30s ou 5min por fonte).
- Estatísticas via `useMemo` sobre listas já em cache.
- Agregações puras (`analytics-service.ts`) O(n); nenhuma query em loop.
- Página lazy-loaded (`webpackChunkName: "admin"` em `App.tsx`).

## Exportação

`utils/csv.ts` fornece `toCsv`, `downloadCsv` (BOM UTF-8) e `triggerPrint`.
CSV exporta as demandas filtradas com colunas de negócio (id, título,
status, prioridade, tipo, responsável, criado/atualizado, SLA, sistema).

## Acessibilidade

- Todos os selects/botões possuem `aria-label`.
- Tabelas com `aria-label`.
- Áreas de gráfico têm cabeçalho `CardTitle` legível.
- Foco visível via primitivos DS 2.0.

## Responsividade

- `PageShell` responsivo (padding 4/6/8).
- `KpiRow` 2 → 3 → 4 → 6 colunas.
- Grids de gráficos usam `md:grid-cols-2`/`lg:grid-cols-2`.
- Toolbar com `flex-wrap` no mobile.

## Fluxo

```
useAnalyticsData(filters)
  ├─ listDemands()               → applyFilters(filters)
  ├─ getUserWorkloads()          → buildDevRows, buildRoutingStats
  ├─ buildCandidatePool()        → buildRoutingStats
  ├─ plataformas.select()        → buildSystemRows
  ├─ workflow_execution_logs     → buildWorkflowStats
  ├─ workflow_definitions        → buildWorkflowStats.ativos
  ├─ ia_uso_log (fetchIaUsage)   → buildAiStats
  ├─ knowledge_articles          → buildKnowledgeStats.topArtigos
  ├─ knowledge_feedback          → buildKnowledgeStats.deflexao
  └─ getProfilesByIds()          → buildDevRows.nome/avatar
```

## Limitações conhecidas

- Taxa de aceitação de sugestões do Smart Routing não é persistida hoje.
  A seção exibe a distribuição real da equipe consumida pelo motor,
  documentando explicitamente essa limitação.
- Economia estimada de workflows usa heurística fixa (2 min por execução
  bem-sucedida). Refinável quando houver rótulos de tempo real por ação.

## Roadmap

1. Persistir aceitação de sugestões do Smart Routing (nova tabela — fora
   do escopo de F017).
2. Heatmap semanal (`recharts` + agregação por dia da semana).
3. Comparativo período-a-período (delta % vs. período anterior).
4. Snapshot noturno para série longa (mês/trimestre) via RPC READ-ONLY.

## Testes

`src/modules/analytics/__tests__/analytics-service.test.ts` cobre:

- `periodSinceIso`, `applyFilters`
- `buildTrend`, `buildDevRows`, `buildSystemRows`
- `buildWorkflowStats`, `buildKnowledgeStats`, `buildSlaStats`, `buildRoutingStats`
- `toCsv` (escape de vírgulas/aspas)

## Módulos preservados (verificado)

- AI Workspace, Portal, Developer Workspace, Command Center, Operations
  Center, Inbox, Knowledge, Routing, Workflow Builder/Engine/Runtime,
  Context Engine, Platform Layer, UX Layer, Design System 2.0.
- Nenhum arquivo desses módulos foi modificado.
