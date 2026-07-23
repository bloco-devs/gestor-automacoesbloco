import type { FeatureEntry } from "../types";

/**
 * Linha do tempo oficial de Features entregues.
 * Ordenada por número da Feature.
 */
export const FEATURE_TIMELINE: FeatureEntry[] = [
  { id: "001", name: "Portal do Solicitante", status: "shipped", doc: "docs/27-Portal-Solicitante.md" },
  { id: "002", name: "Central de Soluções", status: "shipped", doc: "docs/28-Central-Inteligente-Solucoes.md" },
  { id: "003", name: "Admin Base de Conhecimento", status: "shipped", doc: "docs/29-Knowledge-Admin.md" },
  { id: "004", name: "Centro de Operações", status: "shipped", doc: "docs/30-Operations-Center.md" },
  { id: "005", name: "Smart Routing", status: "shipped", doc: "docs/31-Smart-Routing.md", depends: ["ecossistema"] },
  { id: "006", name: "Workflow Builder & Engine", status: "shipped", doc: "docs/32-Workflow-Builder.md" },
  { id: "009", name: "Design System 2.0", status: "shipped", doc: "docs/34-Design-System-2.md" },
  { id: "010", name: "Portal v4 Premium", status: "shipped", doc: "docs/36-Portal-Solicitante-v3.md" },
  { id: "011", name: "Developer Workspace", status: "shipped" },
  { id: "012", name: "Command Center", status: "shipped" },
  { id: "013", name: "Productivity Layer", status: "shipped", doc: "docs/25-Platform-Productivity.md" },
  { id: "014", name: "Production Hardening", status: "shipped", doc: "docs/40-Production-Readiness.md" },
  { id: "017", name: "Analytics Intelligence", status: "shipped", doc: "docs/42-Analytics.md" },
  { id: "018", name: "Ecossistema Ativo", status: "shipped", doc: "docs/43-Auditoria-Ecossistema.md", depends: ["005", "017"] },
  { id: "018.5", name: "Analytics de Afinidade", status: "shipped", doc: "docs/46-System-Affinity-Analytics.md", depends: ["018"] },
  { id: "019", name: "AdminHub 2.0", status: "shipped", doc: "docs/48-AdminHub-2.md" },
  { id: "021", name: "Platform Governance", status: "shipped", doc: "docs/49-Platform-Governance.md", depends: ["019"] },
  { id: "020", name: "AI Copilot", status: "planned", depends: ["021"] },
];
