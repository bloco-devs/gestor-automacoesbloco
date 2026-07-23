# 51 · Platform SDK — Plugin Architecture (FEATURE 100)

> **Status:** Infraestrutura pronta · nenhum plugin ativado.
> **Data:** 2026-07-23
> **Localização:** `src/platform-sdk/`
> **Sandbox:** `/admin/sdk`

Após o **Release Candidate v1.0** (docs/50), o núcleo da plataforma é
considerado estável. Toda funcionalidade nova (v2.0+) **deve** ser
implementada como plugin sobre este SDK, sem tocar no core.

---

## 1. Princípios

1. **Aditivo por definição.** Registrar um plugin **nunca** deve mudar
   comportamento existente até que o host explicitamente ative extension
   points para ele.
2. **Isolamento.** Erros em `activate`, listeners de evento ou renders
   de widget não podem derrubar o core (try/catch de bordas).
3. **Determinismo.** Dependências resolvidas via ordenação topológica;
   sem side effects em `definePlugin`.
4. **Camada complementar.** Permissions do SDK **não** substituem RBAC
   (`ProtectedRoute`) nem RLS do Supabase. Elas apenas gerenciam
   capacidades declaradas por plugins.

---

## 2. Estrutura de pastas

```text
src/platform-sdk/
├── core/
│   ├── definePlugin.ts        Identity helper (autoria de plugins)
│   ├── registry.ts            PluginRegistry (singleton reativo)
│   └── dependency-resolver.ts Ordem topológica + semver simples
├── events/
│   └── eventBus.ts            Pub/sub tipado + ring buffer (100)
├── permissions/
│   └── permissions.ts         Capabilities por plugin
├── hooks/
│   └── index.ts               React hooks (useSyncExternalStore)
├── types/
│   └── index.ts               Manifest, Widget, Command, EventMap
├── __tests__/                 Vitest — registry, deps, bus, perms
└── index.ts                   API pública
```

---

## 3. Anatomia de um plugin

```ts
// src/plugins/exemplo/plugin.ts
import { definePlugin } from "@/platform-sdk";

export default definePlugin({
  id: "exemplo-kpi",
  name: "KPI de Exemplo",
  version: "1.0.0",
  category: "analytics",
  dependencies: [],
  permissions: {
    requires: ["read.demands"],
    provides: ["kpi.exemplo"],
  },
  commands: [
    {
      id: "exemplo.refresh",
      title: "Recarregar KPI de Exemplo",
      shortcut: "mod+shift+e",
      run: () => window.location.reload(),
    },
  ],
  widgets: [
    {
      id: "kpi-card",
      slot: "dashboard",
      order: 10,
      render: () => null, // React node
    },
  ],
  activate: (ctx) => {
    ctx.logger("Plugin exemplo-kpi ativado");
    ctx.bus.on("demand.created", (p) =>
      ctx.logger("nova demanda", p.demandId)
    );
  },
});
```

**Registro** (fora do core, tipicamente em `src/plugins/index.ts` que o
host importa no bootstrap):

```ts
import { pluginRegistry } from "@/platform-sdk";
import exemplo from "./exemplo/plugin";
pluginRegistry.register(exemplo);
await pluginRegistry.activateAll();
```

---

## 4. Extension points oficiais

| Slot              | Onde renderiza (futuro)                 |
|-------------------|-----------------------------------------|
| `sidebar`         | Sidebar principal (DS 2.0)              |
| `dashboard`       | `/dashboard` — grid de KPIs             |
| `workspace`       | `/workspace` (Developer, coluna direita)|
| `portal`          | `/portal` — sugestões contextuais       |
| `operations`      | `/operacoes` — painéis complementares   |
| `analytics`       | `/admin/analytics` — seções extras      |
| `admin`           | `/admin` — cards do Admin Hub 2.0       |
| `commandPalette`  | ⌘K — comandos globais                   |
| `contextPanel`    | Painel contextual do AI Workspace       |
| `copilot`         | Reservado para v2.0                     |

Widgets consultam via hook:

```tsx
import { useExtensionPoint } from "@/platform-sdk";

function DashboardExtensions() {
  const widgets = useExtensionPoint("dashboard");
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {widgets.map((w) => (
        <div key={`${w.pluginId}:${w.id}`}>{w.render({ slot: "dashboard", pluginId: w.pluginId })}</div>
      ))}
    </div>
  );
}
```

> **Observação (v1.0):** os hosts (`Dashboard`, `Portal`, `Sidebar`,
> `Command Palette`) **ainda não consomem** os hooks acima. Isso é
> deliberado — a integração é um passo posterior, quando o primeiro
> plugin real for autorizado.

---

## 5. Event Bus

Eventos tipados em `PlatformEventMap`:

- `demand.created`
- `workflow.executed`
- `routing.finished`
- `knowledge.viewed`
- `portal.request.created`
- `system.matched`
- `feature.enabled`

O core **não emite** nenhum destes eventos hoje. Eles são o contrato
oficial para plugins futuros — o host pode passar a emitir de forma
aditiva sem mudar regra de negócio.

```ts
import { emit, platformBus } from "@/platform-sdk";
emit("demand.created", { demandId: "d1" });
const off = platformBus.on("demand.created", (p) => console.log(p.demandId));
```

Ring buffer de 100 eventos disponível via `platformBus.history()` para o
Sandbox (`/admin/sdk`).

---

## 6. Capability System (Permissions)

Cada plugin declara:

- `requires`: capacidades que precisa consumir de outro plugin.
- `provides`: capacidades que oferece. São concedidas ao próprio plugin
  automaticamente em `activateAll()`.

Uso em runtime:

```ts
import { platformPermissions } from "@/platform-sdk";
platformPermissions.can("meu-plugin", "kpi.exemplo"); // boolean
```

**Não substitui** o `ProtectedRoute` do host nem as políticas RLS.

---

## 7. Dependency Resolver

`resolveDependencies(plugins)` retorna:

- `order`: sequência topológica para ativação (pais antes de filhos).
- `issues[]`: `missing` (dep ausente), `version` (semver não bate),
  `cycle` (dependência circular).

Semver simplificado suporta `x.y.z`, `^`, `~` e `>=`.

Plugins com issue `missing` ou `cycle` são marcados como `status:
"error"` e **não** são ativados. Version mismatches são reportados mas
o plugin ainda é ativado — cabe ao autor decidir se o warning é fatal.

---

## 8. Sandbox `/admin/sdk`

Página read-only que mostra:

- Plugins carregados (id, versão, categoria, status).
- Extension points e contagem de widgets em cada slot.
- Commands registrados por plugins ativos.
- Dependency issues detectadas na última ativação.
- Últimos 100 eventos do bus, com timestamp.

Não permite habilitar/desabilitar plugins — isso será feito via config
no bootstrap. A intenção do Sandbox é **inspeção** para desenvolvedores.

---

## 9. Boas práticas

1. **`activate` deve ser idempotente.** Pode ser chamado múltiplas vezes
   em hot reload.
2. **Sempre limpe listeners em `deactivate`.** O host chama isso durante
   `unregister`.
3. **Nunca importe do host** (`src/pages/*`, `src/modules/*`) dentro do
   `plugin.ts` — mantenha a inversão de dependências.
4. **Namespace command ids e widget ids** pelo `pluginId` para evitar
   colisão (ex.: `"exemplo.refresh"`).
5. **Widgets devem ser puros.** Sem `useEffect` que dispare mutações no
   host; consuma dados via hooks do SDK.
6. **Versionamento:** bump `major` quebra contrato de manifest;
   `minor` adiciona campos opcionais; `patch` é interno ao plugin.

---

## 10. Roadmap de integração

| Etapa       | Ação                                                            |
|-------------|-----------------------------------------------------------------|
| FEATURE 100 | **Este documento.** Infraestrutura entregue. Zero plugins ativos.|
| v2.0        | Primeiro plugin real (piloto). Hosts consomem `useExtensionPoint` nos slots `dashboard` e `sidebar`. |
| v2.1        | Command Palette passa a mesclar `usePluginCommands()` com os comandos nativos. |
| v2.2        | Emissão canônica dos eventos do `PlatformEventMap` a partir do core (aditivo). |
| v2.3        | Página de administração de plugins com toggle de ativação por feature flag. |

---

## 11. Testes

Cobertura mínima em `src/platform-sdk/__tests__/registry.test.ts`:

- Registry: register/list/duplicates/activate/agregações.
- Dependency resolver: order, missing, version, cycles.
- EventBus: entrega, unsubscribe, ring buffer, isolamento de erros.
- Permissions: grant/can/revoke/list.
- Manifest: `definePlugin` como identity + ciclo completo com deps.

Rodar com `bunx vitest run src/platform-sdk`.

---

**Referências cruzadas:** `docs/50-Release-Candidate-v1.md`,
`docs/49-Platform-Governance.md`, `docs/34-Design-System-2.md`.
