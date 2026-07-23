# 56 · Extension Host + Remote Plugin Repository (PLUGIN 004)

## Objetivo

Transformar o Plugin Runtime em um verdadeiro **Extension Host**, com separação
clara entre **Core**, **Host**, **Plugins**, **Repository**, **Manifest**,
**Package**, **Lifecycle** e **Signature**. Nesta versão, nenhum plugin é
baixado da internet — toda a infraestrutura está pronta para v2.4.

## Arquitetura

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐
│ Repository  │──▶ │  Extension   │──▶ │  Plugin    │
│  (bundled,  │    │    Loader    │    │   Host     │
│  local,     │    │  (validator, │    │ (Runtime)  │
│  remote)    │    │  signature,  │    └────────────┘
└─────────────┘    │  compat,     │
                   │  resolver)   │           │
                   └──────────────┘           ▼
                                       ┌────────────┐
                                       │Marketplace │
                                       └────────────┘
```

## Camadas

### `src/platform-sdk/repository/`
API canônica para descoberta de plugins.
- **`types.ts`** — `PluginPackage`, `PackageMetadata`, `PackageSignature`, `PluginRepository`, `RepositoryDiagnosticsEntry`.
- **`bundled.ts`** — `BundledRepository`: plugins compilados junto ao app.
- **`local.ts`** — `LocalRepository`: persistido em `localStorage` (dev/QA).
- **`remote.ts`** — `RemoteRepository`: placeholder para v2.4.
- **`index.ts`** — `PluginRepositoryRegistry` + `bootstrapDefaultRepositories`.

Todos implementam a mesma interface `PluginRepository { list, get, publish?, remove? }`.

### `src/platform-sdk/signature/`
Assinatura simulada (SHA-256 via WebCrypto com fallback FNV-1a).
- `signManifest(manifest, publisher)` → `PackageSignature`
- `verifyManifestSignature(manifest, sig)` → `{ verified, integrity }`
- `canonicalize(manifest)` — serialização determinística.

Publishers `platform.core` e `platform.bundled` são trusted por padrão.

### `src/platform-sdk/versioning/`
Semver enxuto (`=`, `>=`, `>`, `<=`, `<`, `^`, `~`).
- `parseVersion`, `compareVersions`, `satisfies`
- `checkHostCompatibility({ sdkCurrent, hostCurrent, sdkRequired, hostRequired })`

Constantes: `SDK_VERSION = "1.0.0"`, `HOST_VERSION = "1.0.0"`.

### `src/platform-sdk/manifest/`
`validatePackage(pkg)` estende `validateManifest` com checks específicos de package
(id/version coerentes com manifest, sdkVersion/hostVersion parseáveis, presença de assinatura).

### `src/platform-sdk/extension-host/`
- **`loader.ts`** — `loadFromRepositories(registry)` orquestra:
  `Repository → Package → Validator → Signature → Compatibility → Dependency Resolver → Host → Runtime`.
- `bootExtensionHost(registry)` — conveniência: Loader + `pluginHost.initialize`.
- `components/RepositoriesPanel.tsx` — UI read-only para o Sandbox.

### `src/platform-sdk/diagnostics/repository.ts`
`diagnoseRepositories(registry)` — agrega validação, assinatura, integridade
e compatibilidade de cada package.

## Sandbox

`/admin/sdk` ganhou a aba **Repositories** com:
- Repositórios registrados (bundled, local, remote).
- Lista de packages: versão, repo, validade, integridade, trusted, compatibilidade.
- Fingerprints e razões de rejeição.

## Marketplace

`registry/index.ts` agora consome o **Repository API** via
`bundledRepositorySources()` + `ensureRepositoriesBootstrapped()`. As APIs
antigas (`BUNDLED_PLUGINS`, `bundledSources`, `originOf`) permanecem estáveis.
Nenhum plugin é lido diretamente por fora do Repository.

## Testes

`src/platform-sdk/__tests__/extension-host.test.ts` cobre:
- Versioning (compare, satisfies, ranges `^`/`~`)
- Signature (assinar, verificar, detectar tampering, determinismo)
- Manifest Validator (Package-aware)
- Bundled/Local/Remote Repository + Registry (dedup)
- Loader (admissão + rejeição por incompatibilidade)
- Repository Diagnostics

## Roadmap v2.4

- Fetch real no `RemoteRepository` (endpoint + cache + ETag).
- Publisher registry com chaves públicas e verificação real de assinatura.
- Instalação dinâmica via `import()` com sandbox de código.
- Atualizações automáticas (comparação semver + notificação).
- UI de catálogo remoto integrada ao Marketplace.

## Não altera

Platform SDK core, Plugin Runtime, Marketplace UI, Service Mesh, AI Copilot,
HelloPlugin, banco, edge functions, RLS.
