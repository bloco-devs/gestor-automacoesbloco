/**
 * Smart Routing — tipos públicos.
 * Motor 100% local, sem React, sem Supabase.
 */
import type {
  DemandComplexity,
  DemandPriority,
  DemandSlaStatus,
  DemandType,
} from "@/modules/demands/types";

export interface DemandInput {
  id?: string;
  type: DemandType;
  priority: DemandPriority;
  complexity: DemandComplexity;
  sla_status?: DemandSlaStatus | null;
  sla_due_at?: string | null;
  /**
   * F018.4 — sistema relacionado à demanda. Quando presente, o ranker soma um
   * bônus 0..10 baseado na afinidade do candidato com esse sistema. Quando
   * ausente, o comportamento é 100% idêntico ao algoritmo anterior.
   */
  system_slug?: string | null;
}

/**
 * F018.4 — histórico de um candidato em um sistema específico do Ecossistema.
 * Derivado de demandas resolvidas + artigos de conhecimento produzidos.
 */
export interface SystemHistoryEntry {
  slug: string;
  total: number;
  success: number;
  avg_resolution_h: number;
  /** Nº de artigos de knowledge escritos por este dev sobre o sistema. */
  documentation?: number;
}

/**
 * Candidato elegível (developer).
 * Métricas normalizadas por `buildCandidatePool` no serviço.
 */
export interface Candidate {
  user_id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  /** Demandas ativas no momento. */
  active_count: number;
  /** Tempo médio de resolução em horas (últimos 90d). null = sem histórico. */
  avg_resolution_h: number | null;
  /** Nº total de demandas resolvidas nos últimos 90d. */
  resolved_count: number;
  /** Contagem por tipo (últimos 90d) — usada para afinidade. */
  type_history: Partial<Record<DemandType, number>>;
  /** Contagem por prioridade (últimos 90d). */
  priority_history: Partial<Record<DemandPriority, number>>;
  /** Contagem por complexidade (últimos 90d). */
  complexity_history: Partial<Record<DemandComplexity, number>>;
  /** F018.4 — histórico por sistema do Ecossistema (últimos 90d). */
  system_history: SystemHistoryEntry[];
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ScoredCandidate {
  candidate: Candidate;
  score: number; // 0..100 (+ bônus systemFit 0..10 = até 110)
  breakdown: ScoreBreakdown;
  reasons: string[];
  confidence: ConfidenceLevel;
}

export interface ScoreBreakdown {
  specialty: number;
  workload: number;
  speed: number;
  history: number;
  complexity: number;
  priority: number;
  sla: number;
  /** F018.4 — bônus aditivo 0..10 (ausente quando demand.system_slug não informado). */
  systemFit?: number;
}

export interface Weights {
  specialty: number;
  workload: number;
  speed: number;
  history: number;
  complexity: number;
  priority: number;
  sla: number;
}

export interface Ranking {
  top: ScoredCandidate | null;
  alternatives: ScoredCandidate[];
  all: ScoredCandidate[];
  empty: boolean;
}
