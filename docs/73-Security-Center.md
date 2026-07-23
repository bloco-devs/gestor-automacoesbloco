# 73 — Security Center

Rota: `/admin/security` · Role: `developer` · Módulo: `src/modules/security/`.

Painel consolidado de segurança. Todo o conteúdo é read-only e derivado de fontes que já existem no app (Audit, Errors, Threats, Service Mesh, Plugin Host, Compliance estática, Integrity checks).

## Estrutura

```
src/modules/security/
  index.ts        barrel
  score.ts        Security Score (0-100) por categoria + overall
  threats.ts      Threat Center (ring buffer 500)
  compliance.ts   LGPD, ISO27001, OWASP, SOC2, NIST (estáticos)
  policies.ts     Policy Center (localStorage, preparado p/ Supabase)
  integrity.ts    checks read-only sobre Plugin Host + Mesh
  timeline.ts     agregador de Audit + Errors + Threats + Mesh
  reports.ts      geradores CSV (9 relatórios)
  permissions.ts  Permission Explorer (roles/plugins/capabilities)
```

## Páginas

| Rota | Descrição |
| --- | --- |
| `/admin/security` | Dashboard (KPIs de 13 áreas + recomendações + prévia de Integrity). |
| `/admin/security/threats` | Ring buffer filtrável por severidade. |
| `/admin/security/compliance` | 5 frameworks com score, checklist, pendências. |
| `/admin/security/permissions` | Árvore de roles, plugins e capabilities. |
| `/admin/security/policies` | Cadastro client-side de políticas versionadas. |
| `/admin/security/integrity` | Achados de integridade (plugins, mesh, versões). |
| `/admin/security/timeline` | Trilha unificada (Audit + Errors + Threats + Mesh). |
| `/admin/security/reports` | 9 relatórios CSV. |

## Requisitos de UI

DS 2.0: `PageShell`, `PageHeader`, `Section`, `Toolbar`, `StatCard`, `KpiRow`, `EmptyPanel`. Nenhum novo primitive.

## Contratos

Nenhum contrato público novo. `recordThreat()` é uma função pura in-memory — opt-in para consumidores. Todas as APIs de `src/modules/security/` são internas ao Admin Hub.
