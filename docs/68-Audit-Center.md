# 68 — Audit Center

Rota: `/admin/audit` · Módulo: `src/modules/audit/`.

Central única de eventos de auditoria em memória (últimos 1000). Módulos podem registrar eventos via `recordAudit({ type, actor, origin, detail, result })`.

Tipos: login, logout, permission, workflow, plugin, marketplace, ai, knowledge, analytics, portal, workspace, sdk, config, flag, other.

Filtros: busca textual, tipo. Exportação **CSV** integrada (`auditToCsv`).

Sem logger paralelo — reutiliza o mesmo padrão ring-buffer de Errors e Mesh Diagnostics.
