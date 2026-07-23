/**
 * FEATURE 026.4 — Panorama do Gestor + Insights Unificados (composição).
 * Módulo puramente de composição. Não altera motores, dados, edge functions
 * ou banco. Toda a experiência é gated pela feature flag `ux.rewrite`.
 */
export { ManagerShell } from "./ManagerShell";
export { ManagerCopilotPanel } from "./ManagerCopilotPanel";
export { ManagerOverview } from "./ManagerOverview";
export { ManagerQueue } from "./ManagerQueue";
export { ManagerTeam } from "./ManagerTeam";
export { ManagerRisks } from "./ManagerRisks";
export { InsightsTabs, INSIGHTS_TAB_IDS } from "./InsightsTabs";
export { UxRewriteGate } from "@/modules/portal-unified/UxRewriteGate";
