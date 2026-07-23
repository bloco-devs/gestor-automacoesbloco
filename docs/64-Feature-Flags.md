# 64 — Feature Flags

Rota: `/admin/feature-flags` · Módulo: `src/modules/feature-flags/`.

Persistência inicial em `localStorage` (`gab:feature-flags:v1`). API isolada permite migrar para tabela Supabase `feature_flags` sem alterar consumidores.

Campos: `key`, `enabled`, `description`, `scope`, `roles`, `createdAt`, `updatedAt`.

Hooks:
- `useFeatureFlag(key)` — reactive boolean.
- `useFeatureFlags()` — CRUD + lista.

Nenhuma feature existente depende deste painel. Consumo é opt-in.
