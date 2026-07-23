# 52 · Plugin Host Runtime — FEATURE 101

> **Status:** Runtime ativo · nenhum módulo do core consome plugins.
> **Data:** 2026-07-23
> **Localização:** `src/platform-sdk/runtime/`
> **Sandbox:** `/admin/sdk`

A FEATURE 100 entregou a **infraestrutura** do Platform SDK. Esta
feature entrega o **Host de execução** que carrega, valida, resolve e
inicializa plugins registrados no SDK.

Toda entrega é aditiva. Nenhum módulo do core (`src/modules/*`,
`src/pages/*`, engines, hooks, edge functions, banco, RLS) foi tocado.

---

## 1. Arquitetura

```
scanner  →  validator  →  dependency  →  lifecycle  →  renderer
                                          │
                                          ▼
                                      PluginHost
                                          │
                                          ▼
                                     diagnostics
```

Diretório:

```text
src/platform-sdk/runtime/
├── scanner/       Descobre plugins (estático + dynamic import)
├── validator/     Valida manifest sem lançar
├── dependency/    Diagnóstico sobre resolveDependencies
├── lifecycle/     onLoad/onEnable/onDisable/onUnload isolados
├── renderer/      Registro de widgets/commands/sidebar
├── host/          PluginHost — classe principal
├── developer/     Developer API (registerWidget, ...)
├── plugins/hello/ Plugin exemplo
├── hooks/         React hooks para o Sandbox
└── index.ts       API pública do runtime
```

---

## 2. Fluxo de inicialização

1. **Scanner** recebe uma lista de `PluginSource` (manifest estático ou
   `() => import(...)`). Nunca lança — erros ficam em `scan.errors`.
2. **Validator** processa cada manifest. Plugins inválidos ficam com
   `status: "rejected"` e são preservados para diagnóstico.
3. **Dependency Diagnostics** produz ordem topológica, cadeias,
   órfãos, incompatíveis e tempo de resolução (reusa o
   `resolveDependencies` da FEATURE 100).
4. **Lifecycle** executa `onLoad` e depois `onEnable` (aceita
   `activate`/`deactivate` como aliases legados). Cada hook é
   isolado em try/catch e mede duração.
5. **Renderer** recebe widgets, commands e sidebar items dos plugins
   ativos. Grants de `permissions.provides` são aplicados.

Plugins que apresentam erro em qualquer fase ficam em `status:
"error"` — o Host segue processando os demais.

---

## 3. PluginHost

```ts
import { pluginHost } from "@/platform-sdk/runtime";
import HelloPlugin from "@/platform-sdk/runtime/plugins/hello";

await pluginHost.initialize([HelloPlugin]);
pluginHost.diagnostics();          // HostDiagnostics
pluginHost.list();                 // HostPluginRecord[]
pluginHost.widgets("dashboard");   // RegisteredWidget[]
pluginHost.commands();             // RegisteredCommand[]

await pluginHost.disable("hello-plugin");
await pluginHost.enable("hello-plugin");
await pluginHost.reload("hello-plugin");
await pluginHost.unload("hello-plugin");
```

Status possíveis: `registered | loaded | active | disabled |
rejected | error`.

---

## 4. Lifecycle

| Hook       | Momento                                    |
|------------|--------------------------------------------|
| `onLoad`   | Após scan/validação, antes de ativar       |
| `onEnable` | Ativação real (alias: `activate`)          |
| `onDisable`| `disable()` (alias: `deactivate`)          |
| `onUnload` | `unload()` — remove do host                |

Todos opcionais. Nenhum hook derruba o Host. Sempre limpe assinaturas
em `onDisable`/`onUnload`.

---

## 5. Developer API

Fora do lifecycle padrão, autores podem registrar itens usando
helpers imperativos:

```ts
import { DeveloperAPI } from "@/platform-sdk/runtime";

DeveloperAPI.registerWidget("meu-plugin", { id: "w", slot: "dashboard", render: () => null });
DeveloperAPI.registerCommand("meu-plugin", { id: "c", title: "T", run: () => {} });
DeveloperAPI.registerSidebarItem("meu-plugin", { id: "s", label: "S", path: "/x" });
DeveloperAPI.registerDashboardCard("meu-plugin", { id: "kpi", render: () => null });
DeveloperAPI.registerPanel("meu-plugin", "portal", { id: "p", render: () => null });
DeveloperAPI.registerCapability("meu-plugin", "kpi.exemplo");
```

Prefira declará-los no `manifest` — a Developer API é para casos
dinâmicos.

---

## 6. HelloPlugin

`src/platform-sdk/runtime/plugins/hello` registra:

- 1 command (`hello.say`)
- 1 widget (slot `dashboard`)
- 1 capability (`hello.greet`)
- 1 listener em `feature.enabled`

Nada aparece fora do Sandbox — o core não consome os slots.

---

## 7. Diagnóstico

`pluginHost.diagnostics()` retorna:

- `initializedAt`, `initDurationMs`
- `scan`: `{ manifests, errors, durationMs }`
- `dependencies`: ordem, issues, cadeias, órfãos, incompatíveis
- `lifecycleEvents`: cada hook (fase, duração, erro)
- `plugins`: lista completa com `status`, `validation`, `initMs`

O Sandbox `/admin/sdk` expõe todos esses dados em modo leitura.

---

## 8. Boas práticas

1. **Idempotência.** `onLoad`/`onEnable` podem ser chamados múltiplas vezes em reload.
2. **Cleanup.** Sempre desassine em `onDisable`. O renderer limpa widgets/commands automaticamente.
3. **Sem imports do host.** Nunca importe de `src/pages`, `src/modules`, `src/hooks`.
4. **Namespacing.** Prefixe ids (`hello.say`, `hello-card`).
5. **Sem side effects em `definePlugin`.** Toda mutação global vai em `onEnable`.

---

## 9. Testes

Cobertura em `src/platform-sdk/__tests__/runtime.test.ts`:

- Scanner: estático, dinâmico, erros
- Validator: id, slot, semver warning
- Dependency: order, chains, orphans
- Lifecycle: happy path + isolamento de erros
- Renderer: filtro por slot, unregister
- Host: initialize, rejected, disable/enable, erro em activate, dep ausente
- Developer API: widget/command/sidebar/capability
- HelloPlugin: ativação completa

Rodar: `bunx vitest run src/platform-sdk`.

---

## 10. Roadmap

| Etapa       | Ação                                                            |
|-------------|-----------------------------------------------------------------|
| FEATURE 101 | **Esta entrega.** Host, lifecycle, developer API, HelloPlugin.  |
| v2.0        | Primeiro plugin de produto. Hosts reais passam a consumir `useExtensionPoint("dashboard" / "sidebar")`. |
| v2.1        | Command Palette mescla `pluginHost.commands()` com nativos.     |
| v2.2        | Core emite `PlatformEventMap` (aditivo).                        |
| v2.3        | Toggle de ativação por feature flag na página de plugins.       |

---

**Referências:** `docs/51-Platform-SDK.md`, `docs/50-Release-Candidate-v1.md`.
