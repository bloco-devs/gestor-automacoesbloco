# 75 — Enterprise Security

Consolida a FEATURE 024 — Security Center + Compliance Hub para uso corporativo.

## Objetivos

1. **Visibilidade única** de segurança, compliance, ameaças e integridade.
2. **Zero mudança** em Workflow Engine, AI SDK, Orchestrator, Event SDK, Service Mesh, Plugin Runtime, Marketplace, Portal, Workspace, Routing, Knowledge, Ecossistema, Operations, Analytics, banco, edge functions ou RLS.
3. **Preparado para persistência** — cada store client-side (Policies, Threats) tem API isolada; migrar para Supabase é um port de 1 arquivo.

## Production Security Score

15 categorias ponderadas. Categorias e pesos em `src/modules/security/score.ts`:

Authentication (8) · Authorization (8) · Compliance (7) · Audit (6) · Plugins (5) · SDK (5) · Runtime (6) · Errors (6) · Sessions (4) · Feature Flags (3) · Secrets (6) · Performance (4) · Observability (5) · Governance (5) · Security hardening (8).

`overall = Σ(score * peso) / Σ(pesos)`.

## Relatórios (CSV)

- Security · Compliance · Audit · Governance · Plugin · SDK · Service Mesh · Architecture · Timeline.

## Governança & rollout

- Rota base `/admin/security` disponível apenas para role `developer`.
- Todos os módulos são opt-in — nenhum consumidor legado é obrigado a integrar `recordThreat()`.
- Handlers globais de erro já foram anexados pela FEATURE 023 (`attachGlobalErrorHandlers`) — o Security Timeline reaproveita esses buffers.

## Próximos passos (fora desta feature)
1. Persistir Policies em Supabase (`security_policies`) via nova feature.
2. Emitir ameaças reais em pontos-chave (login falho, plugin rejeitado, capability negada) — mudança aditiva de 1-2 linhas por origem.
3. Expor score no Release Center como badge oficial de release corporativo.
