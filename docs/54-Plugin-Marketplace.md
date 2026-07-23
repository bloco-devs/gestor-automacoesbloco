# 54 · Plugin Marketplace & Package Manager

> **PLUGIN 002** — Inaugura oficialmente o ecossistema de plugins da plataforma.
> **Escopo:** UI e serviços de gerenciamento apenas. Zero mudanças no Core, no
> Platform SDK (FEATURE 100), no Plugin Host Runtime (FEATURE 101) ou nos
> plugins existentes (AI Copilot, Hello).

## Arquitetura

```
src/plugins/marketplace/
  registry/       ← lista de plugins bundled (HelloPlugin, AICopilotPlugin)
  catalog/        ← build/filter puro a partir de HostDiagnostics
  diagnostics/    ← Health por plugin (load, memória, warnings, erros)
  compatibility/  ← SDK/Host + dependências
  manager/        ← wrapper sobre pluginHost.enable/disable/reload/unload
  installer/      ← placeholder v2.1 (remoto/assinatura)
  hooks/          ← useCatalog, useMarketplaceBoot, usePluginHealth, useCompatibility
  components/     ← PluginCard, PluginDetails, DependencyGraph, DeveloperConsole…
  pages/          ← MarketplacePage (rota /admin/marketplace e aba /admin/sdk)
  utils/          ← buildDependencyMermaid
  types/          ← CatalogEntry, PluginHealth, CompatibilityReport, CatalogFilter
```

Toda a fonte de verdade continua sendo o `pluginHost` do Runtime. O Marketplace
não instancia um segundo host: ele lê `useHostDiagnostics()` e delega comandos
ao `pluginHost` (`enable/disable/reload/unload`).

## Fluxo

1. **Boot** — `useMarketplaceBoot` chama `pluginHost.initialize(bundledSources())`
   apenas se ainda não houver inicialização (idempotente). O `/admin/sdk` já
   inicializava; abrir `/admin/marketplace` primeiro também funciona.
2. **Catálogo** — `buildCatalog(diag)` deriva `CatalogEntry` a partir do
   `BUNDLED_PLUGINS` e complementa com plugins detectados no host.
3. **Filtro/Sort** — `applyFilter` é puro; UI apenas mantém `CatalogFilter` no
   estado local.
4. **Ações** — `pluginManager.enable/disable/reload/restart/simulateUpdate`
   sempre devolve `{ ok, message }` e nunca lança; erros viram toast.
5. **Health** — `computeHealth` combina manifest surface + `lifecycleEvents`
   já produzidos pelo Host.
6. **Compatibilidade** — `checkCompatibility` valida SDK/Host declarados
   (`>=1.0.0` hoje) e dependências entre plugins.
7. **Grafo** — `buildDependencyMermaid` gera texto Mermaid read-only. UI usa
   `<pre>` sem dependência nova; qualquer viewer Mermaid renderiza.
8. **Console** — Timeline de `lifecycleEvents` + `eventHistory` do `platformBus`.

## Package Manager

Nesta versão o "package manager" opera exclusivamente sobre plugins bundled:

| Ação            | Efeito                                          |
|-----------------|-------------------------------------------------|
| Enable          | `pluginHost.enable(id)`                         |
| Disable         | `pluginHost.disable(id)`                        |
| Reload/Restart  | `pluginHost.reload(id)`                         |
| Simular Update  | `reload` + mensagem de pipeline v2.1            |

`pluginInstaller.install({ kind: "remote", … })` retorna `{ ok: false }` com
motivo — reservado para v2.1.

## Diagnóstico

- **Health por plugin** — status, `loadTimeMs`, memória estimada (heurística),
  `commands`, `widgets`, warnings, contagem de erros e timestamp do último
  evento de lifecycle.
- **Issues** — `validation.errors/warnings` (Manifest Validator) + `error`
  do lifecycle. Plugins `rejected` e `error` continuam visíveis.
- **Dependency Graph** — nós para `Plugin Host`, `Platform SDK`, cada plugin
  e extension points; arestas por `dependencies` e `widgets.slot`.
- **Developer Console** — timeline unificada com eventos de lifecycle e o
  histórico circular do `platformBus`.

## Compatibilidade

`SDK_VERSION` e `HOST_VERSION` são constantes públicas do módulo. Um plugin
pode declarar:

```ts
dependencies: [
  { pluginId: "@platform/sdk", version: ">=1.0.0" },
  { pluginId: "@platform/host", version: ">=1.0.0" },
  { pluginId: "outro-plugin", version: ">=1.0.0" },
]
```

A checagem é intencionalmente simples (`x === y` ou `x > y` em string) para
não introduzir dependência de `semver`; suficiente para MVP interno.

## Integração com Sandbox

`/admin/sdk` ganhou abas `Sandbox` (original) e `Marketplace`
(`<MarketplacePage embedded />`). Nenhum código legado foi removido.

## Roadmap v2.1

- **Repositórios remotos** — `pluginInstaller.install({ kind: "remote", url })`
  passará a fazer `fetch` + `import()` dinâmico do manifest.
- **Assinatura digital** — validar `signature` antes do `validateManifest`.
- **Versionamento** — usar `semver` real, com resolução de ranges.
- **Instalação dinâmica** — `pluginHost.registerRuntime(manifest)` sem
  reinicializar plugins ativos.
- **Rollback** — snapshot de manifests após cada `simulateUpdate` real.
- **Marketplace federado** — múltiplas fontes; hoje há apenas `bundled`.

## Testes

`src/plugins/marketplace/__tests__/marketplace.test.ts` cobre catalog,
filtro, sort, manager (enable/disable/reload/simulateUpdate), health,
compatibilidade, instalador e grafo de dependências.
