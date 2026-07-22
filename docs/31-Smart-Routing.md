# Smart Routing — Motor de Sugestão de Responsáveis

**Status:** Feature 005 · Produção · 2026-07-22
**Escopo:** Recomendação inteligente e determinística de responsáveis para demandas. **Não** atribui automaticamente — apenas sugere; ação continua manual.

---

## 1. Arquitetura

```text
UI (DemandDetailDialog | OperationsPage | InboxPage)
        │
        ▼
useRoutingSuggestions ──► useTeamPool ──► routing-service (Supabase)
        │                                         │
        ▼                                         ▼
   rankCandidates                    profiles + get_user_workloads
   (motor puro)                      + demands (status=concluido, 90d)
        │
        ▼
   scoring + weights + affinity
```

- **Motor puro** (`engine/`): sem React, sem Supabase, sem I/O.
- **Serviço**: um único agregador que reusa `getUserWorkloads` (RPC existente), `profiles` e demandas resolvidas dos últimos 90 dias.
- **Hooks**: `useTeamPool` (React Query, `staleTime` 5 min) e `useRoutingSuggestions` (memo sobre `rankCandidates`).

---

## 2. Algoritmo

Cada candidato recebe **7 subscores em 0..1** (`engine/scoring.ts`), somados pelos pesos e normalizados para 0..100.

| Critério          | Peso | Definição                                                                            |
| ----------------- | ---- | ------------------------------------------------------------------------------------ |
| `specialty`       | 25   | Proporção de resolvidos do mesmo `type` (saturating em 30%).                         |
| `workload`        | 20   | 1 quando ocioso; 0 quando >= 2× mediana da equipe.                                   |
| `speed`           | 15   | Interpolação linear entre `avg_resolution_h` do mais rápido e mais lento do grupo.   |
| `history`         | 10   | `resolved_count / 20` (saturating).                                                  |
| `complexity`      | 10   | Proporção do histórico igual/superior à complexidade da demanda.                     |
| `priority`        | 10   | Proporção do histórico igual/superior à prioridade da demanda.                       |
| `sla`             | 10   | Amplifica `workload` proporcional à urgência (`no_prazo`/`atencao`/`estourado`).     |

Pesos ajustáveis via `RankOptions.weights`; `normalizeWeights` renormaliza para soma = 100.

### Desempate (estável)
1. Menor `active_count`
2. Maior afinidade no `type` da demanda
3. Menor `avg_resolution_h`
4. Ordem lexicográfica de `user_id`

### Confiança
- `high` — score ≥ 80 **e** gap para o 2º ≥ 5
- `medium` — score ≥ 60
- `low` — restante

### Fallback
- Pool vazio → `Ranking.empty`.
- Filtro `eligible` zera candidatos → usa pool completo (registrado como `low`).
- Sem histórico → score neutro (0.25–0.4) por critério afetado.

---

## 3. Integrações

| Onde                    | Componente             | Comportamento                                                                     |
| ----------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| `DemandDetailDialog`    | `RoutingSuggestionCard`| Mostra top + alternativas quando `assigned_to == null`. Botão `Atribuir` chama `useAssignDemand`. |
| `OperationsPage`        | `UnassignedQueueCard`  | Fila sem responsável ranqueada pelo score do top pick.                            |
| `InboxPage`             | `SuggestedForMe`       | Solicitações cujo top pick é o usuário atual (score ≥ 70).                        |

Zero mudanças em AI / Context / Platform / UX / Knowledge / Portal.

---

## 4. Reuso — nada novo no backend

| Recurso                          | Origem                                     |
| -------------------------------- | ------------------------------------------ |
| RPC `get_user_workloads`         | `modules/demands/service`                  |
| Tabela `demands`                 | leitura simples (status=concluido, 90d)    |
| Tabela `profiles`                | leitura simples                            |
| Hook `useAssignDemand`           | `modules/demands/hooks`                    |
| Hook `useDemands`                | `modules/demands/hooks`                    |

**Nenhuma migration, RPC ou Edge Function nova.**

---

## 5. Testes

`src/modules/routing/__tests__/`
- `scoring.test.ts` — cada subscore isolado
- `ranker.test.ts` — pesos, desempate, confiança, filtros, alternativas
- `affinity.test.ts` — derivação de `type_history` / `avg_resolution_h`
- `fallback.test.ts` — pool vazio, candidato único fraco

---

## 6. Roadmap

- Configuração de pesos por admin (`/admin/configuracoes/roteamento`)
- Aprendizado incremental (feedback: "quem realmente atendeu vs. sugestão")
- Modo auto-assign opcional (feature flag por workspace)
- Heurísticas específicas por sistema (`system_id`)
- Instrumentação em `ia_uso_log` para medir taxa de aceite das sugestões
