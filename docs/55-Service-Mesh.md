# FEATURE Service Mesh (PLUGIN 003) — Federation

Camada de comunicação entre plugins da plataforma. Aditiva. Sem toque em Core,
Runtime, Marketplace, Portal, Workspace, Analytics, Operations, Workflow,
Knowledge, Routing, Ecossistema ou AI Copilot além da fiação declarativa.

## Objetivo

Plugins podem publicar, descobrir e consumir capacidades entre si **sem se
importar diretamente**. A única dependência declarada por um plugin
consumidor é o **contrato tipado** — nunca outro plugin.

## Arquitetura

```
+-----------------+     +-----------------+     +-------------------+
|   Provider      |     |   Service Mesh  |     |     Consumer      |
| (Plugin A)      | --> | Registry+Router | <-- | (Plugin B)        |
+-----------------+     +-----------------+     +-------------------+
        |                      |                          |
        v                      v                          v
  provide<C>({...})     discover(query)        resolve<C>(opts)
                        listContracts()        optional<C>(opts)
                        capability check       required<C>(opts)
                        version check          describe<C>(opts)
```

Módulos:

| Módulo | Path | Responsabilidade |
|---|---|---|
| Contracts | `services/contracts/` | Interfaces tipadas (`KnowledgeService`, `RoutingService`, `WorkflowService`, `AnalyticsService`, `CopilotService`, `SearchService`). Fonte da verdade. |
| Registry | `services/registry/` | Armazena `ServiceRecord` in-memory. Emite mudanças. |
| Providers | `services/providers/` | `provide()`, `dispose()`, `reportHealth()`, `runHealthCheck()`. |
| Consumer | `services/consumer/` | `resolve` / `optional` / `required` / `describe`. |
| Discovery | `services/discovery/` | Query por contract, plugin, versão, capability. |
| Mesh | `services/mesh/` | Fachada única (`serviceMesh`) e Capability Resolver. |
| Diagnostics | `services/diagnostics/` | Ring buffer de 200 eventos. |
| Hooks | `services/hooks/` | `useServices`, `useServicesByContract`, `useService`, `useMeshEvents`. |
| Bootstrap | `services/bootstrap/builtins.ts` | Único arquivo que conhece módulos do app. Registra providers `platform.core.*`. |

## Contratos oficiais

```ts
SERVICE_CONTRACTS = {
  knowledge: "service.knowledge",
  routing:   "service.routing",
  workflow:  "service.workflow",
  analytics: "service.analytics",
  copilot:   "service.copilot",
  search:    "service.search",
};
```

Cada contract mapeia para uma interface (`ServiceContractMap[C]`), permitindo
inferência forte:

```ts
const svc = serviceMesh.resolve("service.knowledge", { consumerId: "plugin.x" });
// svc: KnowledgeService
```

## Fluxo típico

**Publicar** (plugin fornecedor):

```ts
const handle = serviceMesh.provide({
  id: "my.knowledge",
  pluginId: "plugin.my",
  contract: "service.knowledge",
  version: "1.0.0",
  visibility: "public",
  requiresCapabilities: ["knowledge.read"],
  impl: myKnowledgeImplementation,
  health: () => ({ status: "healthy", at: Date.now() }),
});
```

**Consumir** (plugin cliente — sem importar o fornecedor):

```ts
const knowledge = serviceMesh.optional("service.knowledge", {
  consumerId: "plugin.ai-copilot",
});
if (knowledge) {
  const hits = await knowledge.search({ query: "sla", limit: 3 });
}
```

**Descobrir**:

```ts
const providers = serviceMesh.discover({ contract: "service.knowledge", version: "^1.0.0" });
```

## Capability Resolver

Cada provider pode declarar `requiresCapabilities`. O consumidor precisa dessas
capabilities registradas em `platformPermissions`. Falhas emitem
`capability.denied` no diagnostics buffer.

## Versionamento

- `x.y.z` (exato), `^x.y.z`, `~x.y.z`, `>=x.y.z`.
- `resolve` prefere providers `healthy`, depois `unknown`, evita `down`.
- `resolve` com `version` filtra candidatos incompatíveis antes de escolher.

## Diagnostics

Eventos capturados no ring buffer:

- `provider.registered` / `provider.disposed`
- `consumer.resolved` (com `durationMs`)
- `consumer.optional-missed`
- `consumer.required-failed`
- `capability.denied`
- `version.incompatible`
- `health.updated`

Exibidos na aba **Service Mesh** de `/admin/sdk`.

## AI Copilot via Mesh

O plugin `plugin.ai-copilot` deixou de referenciar diretamente módulos de
Knowledge/Routing/Analytics. Toda a integração é resolvida por
`src/plugins/ai-copilot/services/mesh-consumer.ts` chamando `serviceMesh.optional`.

Nenhum outro plugin importa o Copilot: futuras integrações passam a consumir
`service.copilot` quando um provider registrar essa capacidade.

## Boas práticas

1. **Nunca `import` outro plugin.** Sempre `serviceMesh.optional/required`.
2. Prefira `optional` em UI (falha silenciosa) e `required` em jobs críticos.
3. Um provider pode ser substituído por outra implementação sem quebrar
   consumidores enquanto o contrato + semver forem compatíveis.
4. Marque `visibility: "internal"` para serviços não expostos a terceiros.
5. Reporte `health` proativamente em endpoints custosos.

## Roadmap

- v1.1: Middleware/interceptors (logging, retries, cache).
- v1.2: Namespaced contracts (`service.knowledge/premium`).
- v1.3: Serviço remoto (mesh cross-tab via BroadcastChannel).
- v2.0: Descoberta dinâmica a partir do Marketplace remoto.

## Critérios de aceite (atendidos)

- ✅ Nenhum plugin importa outro diretamente.
- ✅ Comunicação apenas via Service Mesh.
- ✅ Contratos tipados (`ServiceContractMap`).
- ✅ Descoberta automática (`discover`, hooks).
- ✅ Diagnóstico completo (ring buffer + Sandbox).
- ✅ AI Copilot consome serviços via Mesh (`mesh-consumer.ts`).
- ✅ Marketplace, Runtime, Portal e demais módulos intactos.
- ✅ Typecheck limpo, testes verdes.
