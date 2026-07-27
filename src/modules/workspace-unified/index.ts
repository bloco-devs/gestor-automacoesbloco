/**
 * FEATURE 026.3 — Workspace Unificado (composição).
 * Módulo puramente de composição — não altera motores, dados ou backend.
 * Toda a experiência é gated pela feature flag `ux.rewrite`.
 */
export { WorkspaceShell } from "./WorkspaceShell";
export { UxRewriteGate } from "@/modules/portal-unified/UxRewriteGate";
