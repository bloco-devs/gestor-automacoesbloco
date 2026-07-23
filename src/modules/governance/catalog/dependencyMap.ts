import type { DependencyEdge } from "../types";

/**
 * Mapa direcionado de dependências entre módulos.
 * Refletir apenas relações existentes no repositório atual.
 */
export const MODULE_EDGES: DependencyEdge[] = [
  { from: "workflow-runtime", to: "workflow-engine", strength: 3 },
  { from: "workflow-builder", to: "workflow-engine", strength: 3 },
  { from: "demands", to: "workflow-runtime", strength: 2 },
  { from: "demands", to: "routing", strength: 3 },
  { from: "demands", to: "knowledge", strength: 2 },
  { from: "routing", to: "ecossistema", strength: 2 },
  { from: "operations", to: "routing", strength: 3 },
  { from: "operations", to: "demands", strength: 3 },
  { from: "operations", to: "ecossistema", strength: 2 },
  { from: "analytics", to: "operations", strength: 3 },
  { from: "analytics", to: "routing", strength: 2 },
  { from: "analytics", to: "knowledge", strength: 2 },
  { from: "analytics", to: "workflow-runtime", strength: 1 },
  { from: "inbox", to: "context", strength: 3 },
  { from: "inbox", to: "platform", strength: 2 },
  { from: "ai", to: "context", strength: 3 },
  { from: "ai", to: "platform", strength: 2 },
  { from: "copilot", to: "context", strength: 2 },
  { from: "ecossistema", to: "context", strength: 2 },
  { from: "knowledge-admin", to: "knowledge", strength: 3 },
  { from: "admin-shell", to: "platform", strength: 2 },
  { from: "dashboard", to: "operations", strength: 2 },
];

/**
 * Cadeia principal para visualização vertical (Workflow → ... → Admin).
 */
export const MAIN_CHAIN: string[] = [
  "workflow-engine",
  "routing",
  "knowledge",
  "operations",
  "analytics",
  "ecossistema",
  "admin-shell",
];
