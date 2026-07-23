# PLUGIN 008 — AI Orchestrator SDK + Multi-Agent Runtime

Camada de orquestração multi-agente da plataforma. Aditiva. Não altera Core,
AI SDK, Workflow SDK, Event SDK, Marketplace, Repository, Copilot, Portal,
Workspace, Operations, Analytics, Knowledge, Routing, Ecossistema, banco,
edge functions ou RLS.

## Objetivo

O AI SDK sabe registrar `Skills`, `Agents`, `Tools`, `Prompts` e `Context
Builders`. O Orchestrator é o cérebro que decide **automaticamente**:

- qual agente usar
- qual skill (ou skills) combinar
- quais tools executar
- qual contexto montar
- qual memória utilizar
- qual prompt aplicar
- qual pipeline seguir
- qual policy (custo × qualidade) obedecer

Consumidores (ex.: AI Copilot) chamam `service.ai-orchestrator` e nunca mais
resolvem agentes diretamente.

## Arquitetura

```
src/platform-sdk/orchestrator/
  types/         ExecutionPlan · ExecutionChain · Pipeline · Policy
  policies/      DEFAULT_POLICIES (fast/balanced/quality/developer/economy)
  selectors/     defaultSelectAgent · defaultSelectSkills · defaultSelectTools
  planner/       buildDefaultPlan · runPlanners · define{Planner,Selector,Pipeline,Policy}
  pipeline/      buildDefaultPipeline
  scheduler/     scheduleExecution (sequential | parallel | pipeline · retry · timeout · abort)
  chains/        Ring buffer de plans e chains (100)
  executor/      orchestratorRegistry · planExecution · orchestrate
  diagnostics/   collectOrchestratorDiagnostics
  contracts/     service.ai-orchestrator + AiOrchestratorService
  bootstrap/     provider mesh idempotente
  hooks/         useOrchestrator{Extensions,Plans,Chains,Diagnostics}
  components/    OrchestratorPanel (Sandbox tab)
```

## Contrato

```ts
service.ai-orchestrator = {
  register(ext), registerAll(exts), removePlugin(id),
  plan(ctx, opts): ExecutionPlan,
  orchestrate(ctx, opts): Promise<OrchestrateResult>,
  listPlans, listChains, diagnostics()
}
```

## ExecutionPlan

```
agent · skills[] · tools[] · memory · prompt · pipeline[]
priority · estimatedCost · confidence · reason · warnings[]
```

## Pipeline padrão

```
context → planner → prompt → agent → skill[…] → tool[…] → memory → output
```

Cada step tem `status` (pending/running/ok/error/skipped/cancelled),
`durationMs`, `health` e `warnings`. Steps com `parallelGroup` executam em
paralelo (fan-out/fan-in) preservando ordem entre grupos.

## Policies oficiais

| id | maxAgents | maxSkills | maxTools | scheduling | cost× |
|---|---|---|---|---|---|
| fast      | 1 | 1  | 1  | sequential | 0.5 |
| balanced  | 1 | 3  | 3  | pipeline   | 1   |
| quality   | 2 | 5  | 5  | parallel   | 2   |
| developer | 5 | 10 | 10 | pipeline   | 3   |
| economy   | 1 | 1  | 0  | sequential | 0.25|

Plugins registram policies próprias via `definePolicy()`.

## Extensões

- `definePlanner({plan})` — planner customizado (mais alta prioridade primeiro).
- `defineSelector({selectAgent?, selectSkills?, selectTools?})` — override fino.
- `definePipeline({match, steps, priority})` — substitui os steps padrão quando `match(ctx)` for verdadeiro.
- `definePolicy({...})` — adiciona/estende presets.

## Scheduler

- **Sequential**: um step por vez.
- **Parallel**: fan-out por `parallelGroup`, aguarda fan-in.
- **Pipeline**: mistura os dois com fan-out apenas onde faz sentido.
- `retries` — tentativas por step (default 0).
- `timeoutMs` — timeout lógico por step; ao vencer, marca `error: timeout-Nms`.
- `signal: AbortSignal` — cancelamento cooperativo; steps pendentes ficam `cancelled`.

## Diagnostics & Sandbox

Novo tab **AI Orchestrator** em `/admin/sdk`:

- Overview (contadores por kind, success rate, avg duration, policies)
- Extensions registradas (planner/selector/pipeline/policy)
- Recent Plans (8) com policy, agent, skills, tools, confidence, cost, reason
- Execution Chains (6) com timeline completa por step

## Multi-Agent Example

`src/plugins/multi-agent/`:

- 4 agents (triage/analyst/router/explainer)
- 6 skills (summarize/classify/extract/route/reason/explain)
- 4 tools (count-words/hash/lang/echo)
- 3 pipelines (por módulo/rota)
- 3 policies (fast/deep/debug)
- 2 planners (default + analytics)
- 2 selectors (prefer-triage + skill-picker)

## AI Copilot

O Copilot passa a consumir `service.ai-orchestrator` — todo roteamento de
agentes/skills é delegado ao Orchestrator. A API pública do plugin AI Copilot
(`routePrompt`, `ALL_PROMPTS`, etc.) permanece intacta.

## Boas práticas

1. Planners são **puros** — não devem executar side effects.
2. Selectors respondem `undefined` quando não têm decisão.
3. Pipelines devem casar por contexto (`match`) — evite globais.
4. Policies pequenas e nomeadas por intenção, não por modelo.
5. Reporte `health` em skills/tools/agents — o selector prioriza saudáveis.
6. Nunca chame `runSkill/runAgent/runTool` fora do Orchestrator quando o Copilot é o consumidor.

## Roadmap

- v1.1: middleware de execução (logging/retries/cache).
- v1.2: agent chains (multi-agent debate).
- v1.3: budget-aware policies com preço real do provider.
- v2.0: distribuição via BroadcastChannel + observabilidade cross-tab.
