# 65 — Config Center

Rota: `/admin/settings` · Módulo: `src/modules/settings/`.

Configurações versionadas por chave, com histórico (últimas 10 versões) e rollback.

Categorias: sistema, portal, workspace, analytics, operations, plugins, ai, workflow, knowledge, routing, sdk.

Persistência inicial em `localStorage` (`gab:app-settings:v1`) — a API isolada permite migrar para tabela `app_settings` sem alterar consumidores.

API pública: `listSettings`, `setSetting`, `rollbackSetting`, `useAppSettings`.
