/**
 * FEATURE 026.2 — Portal Unificado.
 * Módulo de composição. Sem novos motores, edges, banco ou IA.
 * Toda experiência renderiza apenas quando `ux.rewrite` está ligada.
 */
export { PortalShell } from "./PortalShell";
export { PortalHeader } from "./PortalHeader";
export { PortalQuickCreate } from "./PortalQuickCreate";
export { PortalRecentDemands } from "./PortalRecentDemands";
export { PortalKnowledgeSection } from "./PortalKnowledgeSection";
export { PortalInboxPreview } from "./PortalInboxPreview";
export { PortalDemandsList } from "./PortalDemandsList";
export { UxRewriteGate } from "./UxRewriteGate";
export { humanizeStatus, humanTime, matchesFilter } from "./statusHuman";
export type { DemandFilter, HumanStatus } from "./statusHuman";
