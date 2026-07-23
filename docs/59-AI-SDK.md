# PLUGIN 007 — AI Skills SDK + Prompt Registry

Infraestrutura oficial e aditiva para desacoplar toda a inteligência artificial da plataforma. Qualquer plugin registra Skills, Prompts, Tools, Context Builders, Agents, Memory Providers e Routers sem tocar no Core ou no Copilot.

## Arquitetura

```
src/platform-sdk/ai-sdk/
  types/            AiSkill/Prompt/Tool/ContextBuilder/Agent/Memory/Router
  registry/         AiExtensionRegistry (in-memory, dedup por kind:id)
  skills/           defineSkill · runSkill
  prompts/          definePrompt · findPromptBySlot · renderUserTemplate
  tools/            defineTool · runTool
  context/          defineContextBuilder · buildContext · buildScopes
  agents/           defineAgent · runAgent · selectAgentForContext
  memory/           createInMemoryProvider · createMockProvider · getMemory
  router/           resolveAi(ctx) — resolve prompt+skill+agent
  diagnostics/      snapshot (health, versões, uso, registro)
  hooks/            useAiExtensions · useAiSdkDiagnostics
  contracts/        service.ai-sdk (mesh contract)
  bootstrap/        bootstrapAiSdkProvider() — provider mesh idempotente
  components/       AiSdkPanel (Sandbox tab)
```

Consumo é feito **exclusivamente via Service Mesh** (`service.ai-sdk`). Plugins nunca importam outro plugin diretamente.

## Registry

Single source of truth in-memory. Cada extensão declara `kind + id + pluginId`. Dedup por `(kind:id)`. `removePlugin(pluginId)` desregistra em bloco. `recordUse(kind, id)` alimenta o painel de uso.

## Skills

```ts
defineSkill({
  id: "summarize-demand",
  pluginId: "meu-plugin",
  title: "Resumir demanda",
  capabilities: ["summarize"],
  contextRequirements: ["entity", "module"],
  version: "1.0.0",
  enabled: true,
  execute: async (input, ctx) => ({ ok: true, output: "..." }),
  health: () => "ok",
})
```

`runSkill(id, input, ctx)` valida existência, habilitação, mede tempo e captura erros — nunca lança.

## Prompts

Prompts são versionados e endereçados por `slot`. Cada prompt pode declarar `match(ctx)` para condicionar resolução; `priority` menor executa antes; `fallbackPromptId` encadeia prompts.

Slots convencionais: `copilot.<module>` (ex.: `copilot.solicitacoes`), `route:/portal`, `copilot.fallback`.

`renderUserTemplate(prompt, vars)` substitui `{{var}}`.

## Tools

`defineTool({ id, description, inputSchema, outputSchema, permissions, execute })`. `runTool` mede tempo e captura erros. Tools são resolvidas por agentes ou diretamente pelo Copilot.

## Context Builders

Cada builder declara um `scope` (`demand`, `developer`, `portal`, `knowledge`, `analytics`, `workflow`, `ecossistema`, `admin`). `buildContext(scope, ctx)` combina todos os builders daquele escopo em um único payload.

## Agents

`defineAgent({ planner?, execute, promptSlot?, toolIds?, contextScopes?, memoryId?, routingPolicy })`. `selectAgentForContext(ctx)` escolhe o agente por módulo/prioridade sem imports diretos.

## Router

`resolveAi(ctx)` executa: (1) routers customizados por prioridade → (2) slot inferido do contexto → (3) fallback: primeiro prompt disponível.

Retorna `{ prompt, skill?, agent?, fallbackUsed, reason }`.

## Memory

`createInMemoryProvider(scope, pluginId, id)` produz um provider volátil (session/conversation/workspace/temporary). `createMockProvider` para testes. `readonly: true` bloqueia writes. **Nada persiste em banco**.

## Service Mesh

Provider `platform.core.ai-sdk` publica o contrato `service.ai-sdk` via `bootstrapAiSdkProvider()` — idempotente e aditivo. `ServiceContractMap` oficial permanece intocado (cast dedicado).

## Sandbox

`/admin/sdk` → aba **AI SDK**: totais por kind, plugins, health, versões e histograma de uso.

## Boas práticas

- Skills são unidades pequenas e serializáveis; agrupe passos em Agents.
- Prompts curtos, versionados, com `slot` estável — nunca hardcode texto de prompt no Copilot.
- Tools puras: sem side effects invisíveis, sempre retornam `AiExecutionResult`.
- Context Builders devem ser rápidos e não bloquear.
- Memory é volátil — use `readonly` para injeção controlada.
- Registre tudo no `activate` do plugin; libere com `removePlugin` no `deactivate`.

## Integração com o AI Copilot

O AI Copilot continua com suas exportações públicas (`routePrompt`, `ALL_PROMPTS`, etc.) — nenhuma quebra de API. A resolução moderna passa por `aiSdkService.resolve(ctx)` via mesh; prompts internos existentes continuam funcionando como fallback local.

## Roadmap

- Persistência opcional de Memory Providers via `Repository API`.
- Assinatura versionada de Prompts.
- Streaming de resultado de Skills.
- Marketplace mostrando o catálogo de skills registradas por plugin.
