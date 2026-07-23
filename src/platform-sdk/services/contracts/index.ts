/**
 * Service Mesh — Contracts.
 * PLUGIN 003 · FEATURE Service Federation.
 *
 * Todos os contratos são tipados. Plugins consumidores dependem APENAS
 * destas interfaces (nunca do plugin fornecedor). Providers podem trocar
 * de implementação sem quebrar consumidores enquanto o `contract` (id) e
 * a `version` (semver) permanecerem compatíveis.
 *
 * NENHUM contrato importa código de módulos do app.
 */

/* -------------------------------------------------------------------------- */
/* Knowledge                                                                  */
/* -------------------------------------------------------------------------- */
export interface KnowledgeSearchInput {
  query: string;
  limit?: number;
}
export interface KnowledgeSearchHit {
  id: string;
  title: string;
  slug?: string;
  similarity?: number;
  source?: string;
}
export interface KnowledgeService {
  readonly kind: "knowledge";
  search(input: KnowledgeSearchInput): Promise<KnowledgeSearchHit[]>;
  suggestForContext?(input: { module: string; text?: string }): Promise<KnowledgeSearchHit[]>;
}

/* -------------------------------------------------------------------------- */
/* Routing                                                                    */
/* -------------------------------------------------------------------------- */
export interface RoutingSuggestion {
  candidateId: string;
  candidateName?: string;
  score: number;
  reasons?: string[];
}
export interface RoutingService {
  readonly kind: "routing";
  suggest(input: { demandId?: string; systemSlug?: string }): Promise<RoutingSuggestion[]>;
}

/* -------------------------------------------------------------------------- */
/* Workflow                                                                   */
/* -------------------------------------------------------------------------- */
export interface WorkflowDescriptor {
  id: string;
  name: string;
  enabled: boolean;
}
export interface WorkflowService {
  readonly kind: "workflow";
  list(): Promise<WorkflowDescriptor[]>;
  describe(id: string): Promise<WorkflowDescriptor | null>;
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */
export interface AnalyticsSummary {
  totalDemands: number;
  openDemands: number;
  averageAgeDays: number;
}
export interface AnalyticsService {
  readonly kind: "analytics";
  summary(): Promise<AnalyticsSummary>;
  track?(event: string, payload?: Record<string, unknown>): void;
}

/* -------------------------------------------------------------------------- */
/* Copilot                                                                    */
/* -------------------------------------------------------------------------- */
export interface CopilotService {
  readonly kind: "copilot";
  ask(prompt: string, meta?: Record<string, unknown>): Promise<{ id: string; accepted: boolean }>;
}

/* -------------------------------------------------------------------------- */
/* Search (universal)                                                         */
/* -------------------------------------------------------------------------- */
export interface SearchHit {
  id: string;
  title: string;
  kind: string;
  href?: string;
}
export interface SearchService {
  readonly kind: "search";
  query(text: string, limit?: number): Promise<SearchHit[]>;
}

/* -------------------------------------------------------------------------- */
/* Catálogo de contratos oficiais                                             */
/* -------------------------------------------------------------------------- */
export const SERVICE_CONTRACTS = {
  knowledge: "service.knowledge",
  routing: "service.routing",
  workflow: "service.workflow",
  analytics: "service.analytics",
  copilot: "service.copilot",
  search: "service.search",
} as const;

export type ServiceContractId = (typeof SERVICE_CONTRACTS)[keyof typeof SERVICE_CONTRACTS];

/**
 * Mapa contrato → tipo. Serve para inferência forte no consumer/registry.
 * Consumidores usam `resolve<"service.knowledge">(...)` e recebem `KnowledgeService`.
 */
export interface ServiceContractMap {
  "service.knowledge": KnowledgeService;
  "service.routing": RoutingService;
  "service.workflow": WorkflowService;
  "service.analytics": AnalyticsService;
  "service.copilot": CopilotService;
  "service.search": SearchService;
}
