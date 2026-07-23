# 49 — Platform Governance & Quality Center

## Objetivo

Criar a camada de **governança técnica** da plataforma. Não adiciona funcionalidade para usuário final: apenas expõe, em leitura, o estado real do sistema — inventário, saúde, dependências, reutilização, documentação, score de qualidade, prontidão de release, dívida técnica e linha do tempo de features.

## Restrições respeitadas

- Zero migrations · Zero Edge Functions · Zero RPC · Zero backend.
- Nenhuma alteração em módulos existentes (AI, Portal, Workspace, Operations, Workflow, Routing, Knowledge, Analytics, Ecossistema, Context, Platform, UX, DS).
- Todo o conteúdo é derivado de dados já existentes no repositório (estáticos, curados na entrega).

## Arquitetura

```text
src/modules/governance/
├── GovernancePage.tsx              # /admin/quality
├── index.ts                        # fachada pública
├── catalog/
│   ├── inventory.ts                # módulos, hooks, services, engines, edge, providers, DS, grandes arquivos
│   ├── dependencyMap.ts            # arestas + cadeia principal
│   └── features.ts                 # timeline oficial
├── health/heuristics.ts            # achados a partir do inventário
├── quality/
│   ├── score.ts                    # 7 eixos ponderados → grade A+/A/B/C
│   ├── reuse.ts                    # dashboard de reuso
│   ├── releaseReadiness.ts         # checklist
│   └── technicalDebt.ts            # débitos curados
├── documentation/docsIndex.ts      # docs/* agrupados
├── components/
│   ├── PlatformOverviewPanel.tsx
│   ├── QualityScorePanel.tsx
│   ├── ReleaseReadinessPanel.tsx
│   ├── ArchitectureCatalogPanel.tsx
│   ├── DependencyMapPanel.tsx
│   ├── ReuseDashboardPanel.tsx
│   ├── CodeHealthPanel.tsx
│   ├── DocumentationCenterPanel.tsx
│   ├── TechnicalDebtPanel.tsx
│   └── FeatureTimelinePanel.tsx
├── hooks/                          # reservado para evolução
├── utils/                          # reservado para evolução
└── __tests__/governance.test.ts
```

## Fluxo

1. Rota `/admin/quality` (dev) monta `GovernancePage` com lazy split por painel.
2. Cada painel consome dados **em memória** vindos de `catalog/`, `health/`, `quality/`, `documentation/`.
3. Scores e boards são computados via `useMemo` — nada de rede, nada de polling.
4. AdminHub 2.0 expõe a entrada em **Plataforma → Quality Center**.

## Módulos entregues

| # | Módulo | Fonte |
|---|--------|-------|
| 1 | Architecture Catalog | `catalog/inventory.ts` |
| 2 | Code Health | `health/heuristics.ts` |
| 3 | Dependency Map | `catalog/dependencyMap.ts` |
| 4 | Reuse Dashboard | `quality/reuse.ts` |
| 5 | Documentation Center | `documentation/docsIndex.ts` |
| 6 | Quality Score | `quality/score.ts` |
| 7 | Release Readiness | `quality/releaseReadiness.ts` |
| 8 | Technical Debt | `quality/technicalDebt.ts` |
| 9 | Feature Timeline | `catalog/features.ts` |
| 10 | Platform Overview | `catalog/inventory.ts` (INVENTORY) |

## Quality Score — eixos

| Eixo | Peso |
|------|------|
| Typecheck | 15% |
| Testes (vitest) | 15% |
| Cobertura estimada | 15% |
| Duplicações | 10% |
| Complexidade | 15% |
| Reutilização | 15% |
| Documentação | 15% |

Grade: `A+ ≥ 92 · A ≥ 82 · B ≥ 70 · C < 70`.

## Boas práticas

- **Manter curado**: qualquer nova feature deve atualizar `catalog/features.ts` e, quando aplicável, `catalog/inventory.ts` e `documentation/docsIndex.ts`.
- **Não escanear em runtime**: a arquitetura descarta I/O propositalmente; a base é *snapshot* mantido junto ao código.
- **Somente leitura**: nenhum painel abre modal de edição ou dispara mutação — se precisar disso, cria-se ferramenta dedicada.

## Roadmap curto

1. Publicar coleta de contagens via script de build (`scripts/govsync`) para manter `inventory.ts` sempre em sincronia.
2. Integrar Quality Score ao Release Readiness (bloquear release se `< B`).
3. Preparar entrada para **FEATURE 020 — AI Copilot**, agora dependente desta camada.
