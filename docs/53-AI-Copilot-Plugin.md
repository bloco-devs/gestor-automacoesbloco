# 53 · AI Copilot Plugin — PLUGIN 001

> **Status:** Ativo (via Sandbox `/admin/sdk`)
> **Data:** 2026-07-23
> **Localização:** `src/plugins/ai-copilot/`
> **SDK:** FEATURE 100 · Host: FEATURE 101

Primeiro plugin oficial da Plataforma v2. Referência para todos os plugins futuros: **zero mudanças no core**, consumo integral do Platform SDK e do Plugin Host Runtime.

---

## 1. Escopo

- Camada inteligente **complementar** — nunca substitui telas.
- Contextual: consome o Context Engine em modo leitura.
- Sem persistência: memória apenas em sessão.
- Sem edge functions novas, sem migrations.

## 2. Arquitetura

```text
src/plugins/ai-copilot/
├── manifest.tsx        definePlugin + widgets/commands
├── types.ts            tipos do plugin
├── events.ts           event bus scoped (copilot.*)
├── memory.ts           conversation memory (sessão)
├── context/provider.ts leitor do Context Engine
├── prompts/
│   ├── index.ts        Prompt Router
│   ├── demands.ts knowledge.ts workflow.ts analytics.ts
│   ├── operations.ts ecossistema.ts portal.ts admin.ts developer.ts
├── actions/index.ts    Quick Actions (buildPrompt)
├── commands/index.ts   Commands do SDK
├── widgets/
│   ├── CopilotDock.tsx
│   ├── CopilotFloatingButton.tsx
│   └── CopilotContextPanel.tsx
├── hooks/useCopilot.ts
├── utils/tokens.ts diagnostics.ts
└── __tests__/copilot.test.ts
```

## 3. Manifest

| Campo | Valor |
|-------|-------|
| id | `plugin.ai-copilot` |
| version | `1.0.0` |
| category | `ai` |
| requires | `ai.use`, `knowledge.read`, `routing.read`, `workflow.read`, `analytics.read` |
| provides | `ai.chat`, `ai.context`, `ai.actions` |

Commands: `copilot.open`, `copilot.ask`, `copilot.explain`, `copilot.summarize`, `copilot.generate`.

Extension Points usados: `copilot`, `contextPanel`, `workspace`, `portal`, `analytics`, `operations`, `commandPalette`.

## 4. Prompt Router

`routePrompt(ctx)` seleciona automaticamente o template com base em:

1. `ctx.route` — mapeamento por prefixo (`/portal`, `/admin/analytics`, `/ecossistema`, ...)
2. `ctx.module` — fallback via `ModuleKey`
3. `prompt.default` — se nenhum bater.

Cada domínio tem prompt separado em `prompts/*.ts`.

## 5. Quick Actions

Cada ação apenas monta contexto — nenhuma escreve dado no core:

- Resumir · Explicar · Gerar subtasks · Responder usuário
- Criar documentação · Relacionar artigo · Explicar Workflow
- Analisar SLA · Explicar Analytics · Explicar Ecossistema

`actionsFor(module)` filtra as relevantes.

## 6. Event Bus (scoped)

O plugin **não** polui o `PlatformEventMap` do core. Usa um bus próprio:

- `plugin.loaded`
- `copilot.opened` / `copilot.closed`
- `copilot.action.executed`
- `copilot.prompt.generated`
- `copilot.error`

APIs: `emitCopilotEvent`, `onCopilotEvent`, `copilotEventHistory`, `subscribeCopilotEvents`. Ring buffer de 100.

## 7. Widgets

| Widget | Slot |
|--------|------|
| CopilotDock | `copilot` |
| CopilotFloatingButton | `workspace` |
| CopilotContextPanel | `contextPanel`, `portal`, `analytics`, `operations` |

Hosts que quiserem exibir consomem via `useExtensionPoint("copilot"|"contextPanel"|...)`. Enquanto isso, o Sandbox `/admin/sdk` diagnostica.

## 8. Developer Tools

Dentro do Sandbox:
- Prompt usado (id do template)
- Tempo (ms)
- Tokens estimados (~4 chars/token)
- Contexto enviado (route/module/entity)
- Ação executada
- Eventos do plugin

## 9. Ciclo de vida

`activate` emite `plugin.loaded` no bus scoped e loga via `PluginContext.logger`. `deactivate` é no-op (nada persistente).

## 10. Testes

`bunx vitest run src/plugins/ai-copilot` — cobre manifest, prompt router, quick actions, memória, event bus, developer tools/runAction e ativação no Host.

## 11. Roadmap

| Etapa | Ação |
|-------|------|
| PLUGIN 001 | **Esta entrega.** Camada, prompts, widgets, sandbox. |
| v1.1 | Hosts (Workspace/Portal) passam a consumir `useExtensionPoint`. |
| v1.2 | Integração real com edge `assistente-demanda` via ação segura. |
| v1.3 | Streaming e ferramentas server-side. |
