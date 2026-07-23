# F018.5 — System Affinity Analytics

Camada analítica sobre a **F018.4** (Smart Routing por Afinidade de Sistema). Transforma o campo `Candidate.system_history` em painéis visuais para gestão do ecossistema. **100% aditiva, zero backend.**

## Arquitetura

```
┌────────────────────────┐    (React Query, cache 5min)
│ useTeamPool()          │──► Candidate[]  (F018.4)
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ utils/systemAffinityAnalytics.ts   (puro, sem I/O)     │
│  ├─ buildAffinityMatrix()          → Heatmap           │
│  ├─ buildSystemRankings()          → Ranking           │
│  ├─ buildCoverage()                → Cobertura         │
│  ├─ detectRisks()                  → Risco             │
│  ├─ buildInsights()                → Insights          │
│  └─ buildDeveloperComparison()     → Minha esp.        │
└──────────┬─────────────────────────────────────────────┘
           │
           ▼  useMemo em cada componente
┌───────────────────────────────────────────┐
│ Analytics    Operations   Workspace       │
│  ├ Heatmap    ├ Especial. ├ Minha Esp.   │
│  ├ Ranking    ├ Riscos                    │
│  ├ Cobertura  └ Cobertura                 │
│  ├ Riscos                                 │
│  └ Insights                               │
└───────────────────────────────────────────┘
```

## Fluxo

1. **Coleta:** `useTeamPool` (React Query) devolve `Candidate[]` já com `system_history` (F018.4). Não faz nova query.
2. **Agregação:** utilitário puro `systemAffinityAnalytics.ts` transforma o pool em estruturas de renderização. Reutiliza `systemAffinityPercent` e `scoreSystemFitBreakdown` do motor de routing — **não redefine matemática de afinidade**.
3. **Renderização:** cada componente aplica `useMemo` sobre o pool. O React Query já garante compartilhamento de cache entre painéis.

## Componentes

| Arquivo | Propósito |
| --- | --- |
| `SystemAffinityHeatmap.tsx` | Matriz Dev × Sistema; célula colorida por afinidade; tooltip com demandas/sucesso/tempo/artigos. |
| `SystemAffinityRanking.tsx` | Top-N desenvolvedores por sistema; badge "Especialista" quando afinidade ≥ 60%. |
| `SystemCoverageCard.tsx` | Distribuição de sistemas em 0/1/2+ especialistas + cobertura geral. |
| `SystemRiskCard.tsx` | Risco Operacional (severidade alta/média/baixa) — sem especialista, ponto único, sem docs, especialista inativo. |
| `SystemInsights.tsx` | Frases automáticas derivadas (sem IA). |
| `EspecialidadeCard.tsx` (routing/F018.4) | Card "Minha Especialização" no Developer Workspace — agora consome `buildDeveloperComparison` via nova seção. |

## Reutilização

- **Routing:** `useTeamPool`, `Candidate`, `SystemHistoryEntry`, `systemAffinityPercent`, `scoreSystemFitBreakdown`.
- **Analytics:** `AnalyticsPage`, `Section`, `KpiRow`, `StatCard`.
- **Design System:** `Card`, `Badge`, `Progress`, `Tooltip`, `Avatar`.
- **Nenhum** hook novo de dados; nenhuma edge; nenhuma RPC.

## Performance

- Cada agregação é **O(sum(system_history))** — na prática ≤ O(devs · sistemas).
- Nenhum loop O(n²) evitável; nenhum efeito colateral.
- Todo cálculo é `useMemo` com dependência apenas em `pool` e parâmetros de exibição (limit, topN).
- Zero polling; realtime já vem da F018.3 via invalidação de cache do `useTeamPool`.

## Limitações

1. Threshold de especialista é fixo (60%). Ajustável apenas por edição de código (ver Roadmap).
2. Detecção de "inativo" usa `active_count === 0`. Não conhece férias/afastamento — próximo passo é integrar com `provisioning`.
3. Documentação é atribuída via `slugify(plataformas.nome) → sistema_slug` — se um sistema for renomeado, artigos anteriores permanecem contando pelo slug antigo até nova indexação.
4. O heatmap trunca visualmente >20 sistemas; scroll horizontal habilitado. Sem virtualização (custo baixo para o tamanho atual).

## Roadmap

- **Filtro por período** (últimos 30/60/90 dias) — hoje o `useTeamPool` cobre 90d.
- **Threshold configurável** em `/admin/routing` (integra com F019).
- **Alertas Realtime** quando único especialista fica ausente por >N dias.
- **Heatmap por Complexidade × Sistema** — reuso do mesmo utilitário com `complexity_history`.
- **Exportação CSV** dos riscos e ranking (via `utils/csv` já existente em analytics).
