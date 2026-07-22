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
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ScoredCandidate {
  candidate: Candidate;
  score: number; // 0..100
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
