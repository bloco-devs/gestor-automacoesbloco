# Sprint 0 — Arquitetura (v26.5)

Fundação técnica aditiva. Nenhuma tela, rota, migration ou edge function foi alterada. Todo código legado permanece funcional.

## Entregas

### `src/core/`

- **`flags/`** — Feature Flags tipadas por categoria (`kanban`, `dashboard`, `workflow`, `automation`, `ai`, `ux`, `search`, `timeline`, `templates`). Overrides em memória, resolução via env var opcional. Compatível com `ux.rewrite` existente.
- **`events/`** — Domain Event Bus tipado + catálogo versionado (`card.*`, `task.*`, `workflow.*`, `automation.*`, `notification.*`, `request.*`, `ai.*`). `domainBus` global exportado.
- **`errors/`** — `AppError`, `NotFoundError`, `ForbiddenError`, `ValidationError`, `RepositoryError`.
- **`logging/`** — `createLogger({ module })` com níveis e prefixo. Silencioso em produção.
- **`security/`** — Permission matrix client-side espelhando `has_role()` (fonte de verdade continua no RLS).
- **`cache/`** — `MemoryCache` LRU com TTL e `StorageCache` sobre `localStorage`.
- **`constants/`, `config/`** — Constantes e runtime config.

### `src/domain/` (bounded contexts)

Estrutura oficial:

```
<context>/
  types/ dto/ mappers/ validators/ repositories/ services/ events/ index.ts
```

Contextos inicializados nesta sprint:

- `shared/` — `Result`, `Repository` base.
- `board/` — Primeiro contexto completo:
  - `types/`: `BoardEntity`, `CardEntity`, `ColumnEntity`.
  - `dto/`: `BoardDTO`, `CardDTO`, `ColumnDTO` (sem campos internos).
  - `mappers/`: entity → DTO.
  - `validators/`: `CardValidator` (regras de negócio isoladas).
  - `repositories/`: interface `CardRepository` + `MemoryCardRepository` (tests) + `SupabaseCardRepository` (aditivo, coexiste com `useAtividadesBoard`).
  - `services/`: `CardService` orquestra repo + validator + `domainBus`.

Demais contextos (`workflow`, `automation`, `requests`, `activities`, `notifications`, `users`, `templates`, `knowledge`, `ai`, `analytics`) serão implementados sob demanda das próximas sprints.

## Regras arquiteturais

1. `src/core/*` não importa `src/modules|pages|components`.
2. `src/domain/*` não importa React, Tailwind ou UI. Depende só de `core` e do cliente Supabase quando é impl concreta.
3. UI consome **DTOs**, nunca entidades cruas.
4. Serviços emitem Domain Events via `domainBus` — nunca "puxam" listeners diretamente.
5. `registerFlag` é idempotente — módulos podem registrar suas flags em import-time sem risco.

## Migração incremental

Nenhum código existente precisa mudar agora. Nas próximas sprints:

- **Sprint A** consumirá `MemoryCache`, `StorageCache`, `createLogger`.
- **Sprint B** consumirá `CardService` + `domainBus` para undo/redo e ações em lote.
- **Sprint C+** usará `feature_flags.registry` para gates.
- **Sprint J (IA)** implementará `domain/ai/` (prompt registry, cache, cost monitor) consumindo `core/cache`.

## Testes

- `src/core/__tests__/flags.test.ts`
- `src/core/__tests__/events.test.ts`
- `src/domain/board/__tests__/CardService.test.ts`

Cobrem: defaults + overrides de flags, entrega tipada de eventos + unsubscribe + history, criação/movimentação de cards com validação e emissão de Domain Events.

## Riscos e compatibilidade

- **Zero** breaking changes: apenas novos arquivos.
- Nenhuma nova dependência npm.
- Nenhuma migration.
- `SupabaseCardRepository.create` intencionalmente lança `RepositoryError` — a criação real ainda ocorre via hooks existentes (será conectada na Sprint B com os novos casos de uso).
