
# Feature 005 — Smart Routing (Motor de Sugestão de Responsáveis)

## Escopo
Motor 100% local e determinístico que rankeia candidatos para cada demanda. Apenas **sugere**; a atribuição continua manual (reusa `useAssignDemand`). Zero backend novo.

## Auditoria — o que já existe e será reutilizado

**Dados / Backend (nenhuma migration nova)**
- `demands` (assigned_to, type, priority, complexity, sla_*, ai_*)
- `profiles` (nome, email, avatar_url)
- `user_roles` (papel `developer`) — fonte da equipe elegível
- RPC `get_user_workloads` — carga ativa por atendente
- `demand_audit_logs` — histórico para cálculo de tempo médio e afinidade por tipo

**Módulos**
- `modules/demands/service.ts` — `getUserWorkloads`, `assignDemand`, `listDemands`
- `modules/demands/hooks.ts` — `useAssignDemand`, `useDemands`
- `modules/operations/*` — `useOperationsData` (snapshot já traz demandas+workloads); `insights-engine` receberá insumos do motor
- `modules/inbox/*` — `PriorityCard`, hook de dados; ganha seção "Sugestões para mim"
- `modules/context/*` — `contextStore` fornece `user.id` e módulo atual
- `modules/platform/*` — sem alteração
- `modules/ai/*` — não é chamado (motor local)

## Novo módulo: `src/modules/routing/`

```text
routing/
  engine/
    scoring.ts        # cálculo puro de score por candidato
    ranker.ts         # aplica pesos, desempates, corte de confiança
    weights.ts        # pesos default + tipo Weights
    affinity.ts       # deriva afinidade por tipo a partir do histórico
  services/
    routing-service.ts # monta CandidatePool (equipe + workloads + histórico) via Supabase
  hooks/
    useRoutingSuggestions.ts  # React Query: (demand) => Ranking
    useTeamPool.ts            # cache do pool de candidatos
  components/
    RoutingSuggestionCard.tsx # UI "Sugestão da IA" no DemandDetailDialog
    SuggestionReasons.tsx     # chips de motivos + score
    AlternativesList.tsx
  types/index.ts
  utils/format.ts
  __tests__/
    scoring.test.ts
    ranker.test.ts
    affinity.test.ts
    fallback.test.ts
  index.ts
```

### Motor (`engine/`) — puro, sem React/Supabase
Assinatura:
```ts
rankCandidates(demand: DemandInput, pool: Candidate[], weights?: Weights): Ranking
```
- `Candidate`: `{ user_id, nome, avatar_url, active_count, avg_resolution_h, type_affinity: Record<type, number>, priority_affinity, complexity_affinity }`
- Score 0–100 = soma ponderada normalizada de:
  - Especialidade (afinidade por `type`) — peso 25
  - Carga atual (invertida, normalizada pela mediana) — peso 20
  - Tempo médio de resolução (invertido) — peso 15
  - Histórico (nº atendidos no mesmo tipo) — peso 10
  - Complexidade compatível — peso 10
  - Prioridade compatível — peso 10
  - SLA/urgência (favorece quem tem folga) — peso 10
- Desempate: menor `active_count` → maior `type_affinity` → menor `avg_resolution_h`
- Confiança: `high >= 80`, `medium >= 60`, `low` caso contrário
- Motivos: strings i18n curtas (ex.: "Especialista em Backend RH", "Carga 45%")
- Fallback: sem candidatos → `Ranking.empty`; ninguém elegível → sugere quem tem menor carga apenas com aviso `low`

### Serviço (`services/routing-service.ts`)
- `buildCandidatePool()`:
  - Lê `user_roles` (role `developer`) + `profiles`
  - `getUserWorkloads()` (reuso)
  - Uma query única em `demand_audit_logs` (últimos 90d, ação `assigned`) + `demands` para derivar `type_affinity` e `avg_resolution_h` no cliente
  - Retorna `Candidate[]`
- Cache via React Query (staleTime 5 min)

### Hook
- `useRoutingSuggestions(demand)` → `{ ranking, isLoading }` — combina `useTeamPool` + `rankCandidates` em `useMemo`

## Integrações

**DemandDetailDialog** (arquivo existente — insert aditivo)
- Novo bloco `RoutingSuggestionCard` acima do seletor de responsável (quando `demand.assigned_to == null`)
- Botão "Atribuir" chama `useAssignDemand` já existente
- Alternativas expansíveis

**Centro de Operações** (`OperationsPage`)
- Nova aba/card `UnassignedQueue`: lista demandas sem responsável ordenadas por score do top candidato
- `insights-engine` recebe insumo do motor para: "3 sugestões prontas para atribuir", "distribuição desigual — pico em X"

**Inbox** (`modules/inbox`)
- Nova seção `SuggestedForYou`: filtra ranking cujo `top.user_id === currentUser.id` e score ≥ 70
- Reutiliza `PriorityCard` com badge "Sugerido pra você"

## Fora do escopo (não tocar)
- AI / Context / Platform / UX / Knowledge / Portal
- Nenhuma nova tabela, RPC, migration ou Edge Function
- Nenhuma auto-atribuição (o `AUTO` existente no CreateDemandDialog não muda)

## Testes (`__tests__/`)
- `scoring`: cada critério isolado
- `ranker`: pesos, empates, corte de confiança, ordenação estável
- `affinity`: derivação de `type_affinity` a partir de logs mockados
- `fallback`: pool vazio, sem elegíveis, workloads todos iguais

## Documentação
- `docs/31-Smart-Routing.md`: arquitetura, algoritmo, pesos default, critérios, integração com Demandas/Operações/Inbox, roadmap (auto-assign opcional, pesos configuráveis por admin, aprendizado incremental)

## Critérios de aceite
- Motor desacoplado, testado, sem imports de React/Supabase
- Sugestões visíveis no DemandDetailDialog com botão "Atribuir" manual
- UnassignedQueue e insight no Centro de Operações
- SuggestedForYou no Inbox
- Zero mudanças em AI/Context/Platform/UX/Knowledge/Portal
- Zero migrations/edge functions novas
- `tsgo` limpo, vitest verde

## Entrega
Resumo executivo listando reuso (tabelas, RPCs, hooks, componentes) vs. novos artefatos (todos em `src/modules/routing/` + `docs/31-Smart-Routing.md`).
