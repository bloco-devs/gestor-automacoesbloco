# 63 — Error Center

Rota: `/admin/errors` · Módulo: `src/modules/errors/`.

Ring buffer in-memory (últimos 500 eventos) com filtros por criticidade, origem e busca textual. Captura automática:
- `window.error` → source `javascript`.
- `unhandledrejection` → source `promise`.

Handlers globais são anexados uma única vez em `AppLayout` via `attachGlobalErrorHandlers()`. Módulos podem registrar erros de qualquer origem chamando `recordError({ severity, source, message, detail })`.

API pública:
- `recordError`, `errorHistory`, `subscribeErrors`, `clearErrors`, `useErrorHistory`.
