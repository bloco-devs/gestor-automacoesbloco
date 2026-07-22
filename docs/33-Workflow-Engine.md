# Workflow Engine — Motor Desacoplado

**Status:** Feature 006B · Produção · 2026-07-22
**Escopo:** Motor puro (plan + run). **Não altera** banco, IA, Context, Platform, Portal, Knowledge, Operations, Smart Routing, Inbox ou Workflow Builder.

---

## 1. Objetivo

Fornecer um motor síncrono capaz de:

1. Receber `WorkflowDefinition` + `EngineContext` → retornar `ExecutionPlan`.
2. Executar o plano em `dryRun` (sem I/O) ou `live` (via adapters — nesta Feature, **apenas mocks**).
3. Reutilizar o simulador do Workflow Builder (Feature 006A) como consumidor da mesma engine.

Sem React, sem Supabase, sem efeitos colaterais em produção.

## 2. Arquitetura

```text
src/modules/workflow-engine/
  engine/       WorkflowEngine · WorkflowRunner · ConditionEvaluator
  registry/     ActionRegistry (Registry Pattern)
  adapters/     interfaces + mocks (Adapter Pattern)
  validators/   WorkflowValidator (reusa builder validator)
  types/        ExecutionPlan · ExecutionResult · EngineContext · ...
  utils/        simulate (fachada compatível)
  __tests__/    7 suítes
```

```mermaid
flowchart LR
  WF[WorkflowDefinition] --> ENG[WorkflowEngine.plan]
  CTX[EngineContext] --> ENG
  ENG --> PLAN[ExecutionPlan]
  PLAN -->|dryRun| RUN[WorkflowRunner]
  PLAN -->|live|  RUN
  RUN -->|dryRun| MOCK[Outcomes: mocked]
  RUN -->|live|  AD[Adapters MOCK]
  AD --> OUT[ExecutionResult]
  MOCK --> OUT
```

## 3. Responsabilidades

| Componente | Entrada | Saída | Efeito |
|---|---|---|---|
| `WorkflowEngine` | `Workflow`, `EngineContext` | `ExecutionPlan` | Nenhum |
| `ConditionEvaluator` | `Workflow`, `EngineContext` | matched + nós | Nenhum (reusa `simulateWorkflow`) |
| `WorkflowValidator` | `Workflow` | erros | Nenhum (reusa validator do Builder) |
| `ActionRegistry` | `ActionType` | `ActionExecutor` | Registry global (`registerExecutor`) |
| `WorkflowRunner` | `ExecutionPlan`, `RunOptions` | `ExecutionResult` | Só chama adapters em `live` |
| Adapters | contratos | — | **Somente mocks nesta Feature** |

## 4. Registry Pattern

Executores são registrados via `registerExecutor(exec)`. Cada `ActionType` da Feature 006A já tem executor default que delega para o adapter correspondente. Executores podem ser sobrescritos (usado em testes/mocks).

## 5. Adapter Pattern

Interfaces em `adapters/interfaces.ts`:

- `DemandAdapter` · `NotificationAdapter` · `KnowledgeAdapter`
- `RoutingAdapter` · `InboxAdapter` · `OperationsAdapter`

Implementações concretas serão feitas em fases futuras. Nesta Feature apenas `createMockAdapters()` existe — grava chamadas em memória e não toca produção.

## 6. Execution Plan

```ts
{
  workflowId, workflowVersion, mode,
  matched, matchedNodes, unmatchedNodes,
  steps: [{ id, action, reason }],
  validationErrors: string[],
  createdAt,
}
```

O plano é o contrato entre "decidir" e "executar" — pode ser inspecionado, versionado ou serializado sem executar nada.

## 7. Reuso do Simulador

`utils/simulate.ts` roda `WorkflowEngine.plan(..., { mode: "dryRun" })` e devolve o mesmo shape que `SimulationResult` da Feature 006A + o `ExecutionPlan` completo. Nenhuma lógica de avaliação foi duplicada.

## 8. Roadmap

1. Persistência de `workflow_definitions` e `workflow_execution_logs` (Supabase, RLS).
2. Implementações reais dos adapters (Demand/Notification/Routing/Knowledge/Inbox/Operations).
3. Triggers/gatilhos automáticos (edge functions, jobs).
4. Painel de execuções em `/admin/workflows/execucoes`.
5. Sugestão de workflows via IA.

## 9. Restrições cumpridas

- Zero banco · Zero migrations · Zero Edge Functions · Zero RPC.
- Nada em `AI Workspace`, `Intent Engine`, `Context Engine`, `Platform Layer`, `Human First UX`, `Portal`, `Knowledge`, `Operations`, `Smart Routing`, `Inbox` ou `Workflow Builder` foi alterado.
