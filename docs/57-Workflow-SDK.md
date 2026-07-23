# 57 · Workflow SDK + Automation Extensions (PLUGIN 005)

## Objetivo

Permitir que plugins registrem novos **triggers, conditions, actions,
validators, transformers e execution hooks** para o Workflow Engine
existente — sem tocar em uma linha do Engine, do Builder ou do Runtime.

O Engine continua sendo a única autoridade de execução; plugins apenas
publicam extensões no registry oficial do SDK.

## Arquitetura

```
┌───────────────┐        ┌───────────────────────────┐
│    Plugin     │──▶──▶  │  Workflow SDK Registry    │
│ (via SDK)     │        │  triggers / actions /     │
└───────────────┘        │  conditions / validators /│
                         │  transformers / hooks     │
                         └──────────────┬────────────┘
                                        │
                       ┌────────────────▼────────────────┐
                       │  Workflow SDK Service (Mesh)    │
                       │  contract: service.workflow-sdk │
                       └────────────────┬────────────────┘
                                        │
                             ┌──────────▼───────────┐
                             │  Workflow Engine     │
                             │  (intacto — futuro   │
                             │  consumidor)         │
                             └──────────────────────┘
```

## Camadas

### `src/platform-sdk/workflow-sdk/types/`
Contratos de extensão. Cada `WorkflowExtension` é uma união discriminada
por `kind`: `trigger`, `condition`, `action`, `validator`, `transformer`, `hook`.
Nunca importa nada do app.

### `src/platform-sdk/workflow-sdk/registry/`
`WorkflowExtensionRegistry` — indexação in-memory, dedup por `(kind, id)`,
subscribe para React. Singleton exportado como `workflowExtensionRegistry`.

### `src/platform-sdk/workflow-sdk/contracts/`
`WorkflowSdkService` — API pública em cima do registry. Contrato
`service.workflow-sdk` v1.0.0. Serve como fachada única para plugins.

### `src/platform-sdk/workflow-sdk/bootstrap/`
`bootstrapWorkflowSdkProvider()` — publica o `workflowSdkService` no
Service Mesh como provider de `platform.core`. Idempotente. Aditivo:
não altera o `ServiceContractMap` oficial.

### `src/platform-sdk/workflow-sdk/execution/`
`runAction`, `runTrigger`, `cancelRun` — orquestram hooks
(`beforeExecute`, `afterExecute`, `beforeAction`, `afterAction`,
`onError`, `onCancel`). Nunca lançam; falhas de hook não derrubam a run.

### `src/platform-sdk/workflow-sdk/validation/`
`runValidators(definition)` — executa todos os validators registrados
e agrega `ValidatorIssue[]` (`info`/`warning`/`error`).

### `src/platform-sdk/workflow-sdk/diagnostics/`
`collectWorkflowSdkDiagnostics()` — snapshot puro (total, byKind, byPlugin, lista).

### `src/platform-sdk/workflow-sdk/hooks/`
`useWorkflowExtensions()`, `useWorkflowSdkDiagnostics()` — hooks reativos
via `useSyncExternalStore`.

## Registro (contrato para plugins)

```ts
import { workflowSdkService } from "@/platform-sdk/workflow-sdk";

const dispose = workflowSdkService.registerAll([
  {
    kind: "action",
    id: "action.demand.comment",
    pluginId: "meu-plugin",
    name: "Criar comentário",
    execute: (ctx, payload) => ({ ok: true, output: { commentId: "..." } }),
  },
]);

// no deactivate:
dispose();
workflowSdkService.removePlugin("meu-plugin");
```

## Lifecycle

1. Plugin chama `bootstrapWorkflowSdkProvider()` (idempotente).
2. Plugin registra extensões via `workflowSdkService.registerAll([...])`.
3. Consumidores (Engine, Sandbox, UIs futuras) leem via hooks / service.
4. No `deactivate`, plugin descarta o disposer e chama `removePlugin`.

## Sandbox

`/admin/sdk` ganhou a aba **Workflow SDK** com contagem por tipo,
distribuição por plugin e lista completa de extensões registradas.

## Plugin de exemplo

`src/plugins/workflow-extensions/` — registra 2 triggers, 2 actions,
2 conditions, 1 validator e 1 hook. Sem side-effects no app.

## Não altera

Workflow Builder, Workflow Runtime, Workflow Engine, Routing, Knowledge,
Portal, Workspace, Analytics, Operations, Ecossistema, Marketplace,
Repository, Service Mesh core, SDK core, banco, edge functions, RLS.

## Boas práticas

- Extensões devem ser **puras e determinísticas** — sem I/O direto.
- I/O pesado → publicar como serviço no Service Mesh; a extensão só
  orquestra.
- Sempre limpar registros no `deactivate` (`removePlugin` + disposer).
- Validators devem ser rápidos (< 5ms).
- Hooks são best-effort; nunca dependa deles para correção.

## Roadmap v2.5

- Consumo pelo Workflow Engine (feature flag).
- UI para arrastar extensões no Builder.
- Versionamento por extensão + compatibility gate no host.
- Sandbox de execução isolado (Web Worker).
- Persistência de bindings action → workflow.
