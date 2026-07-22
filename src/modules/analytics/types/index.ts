/**
 * Analytics — tipos públicos.
 * Read-only. Nenhuma nova entidade de banco.
 */
import type { Demand, DemandPriority, DemandStatus, DemandType } from "@/modules/demands/types";

export type AnalyticsPeriod = "7d" | "30d" | "90d";

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  systemId?: string | null;
  assignedTo?: string | null;
  priority?: DemandPriority | null;
  type?: DemandType | null;
  status?: DemandStatus | null;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  criadas: number;
  concluidas: number;
  backlog: number;
}

export interface DevRow {
  user_id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  concluidas: number;
  backlogAtual: number;
  tempoMedioHoras: number | null;
  slaCumprimentoPct: number | null;
  workload: number;
}

export interface SystemRow {
  id: string | null;
  nome: string;
  bugs: number;
  melhorias: number;
  automacoes: number;
  backlog: number;
  slaCumprimentoPct: number | null;
}

export interface WorkflowStats {
  ativos: number;
  totalDefinicoes: number;
  execucoes: number;
  sucesso: number;
  falhas: number;
  duracaoMediaMs: number | null;
  economiaEstimadaMin: number;
}

export interface KnowledgeStats {
  publicados: number;
  totalFeedback: number;
  deflexao: number;
  taxaResolucaoPct: number;
  topArtigos: Array<{ id: string; titulo: string; views: number }>;
}

export interface AiStats {
  totalCalls: number;
  errorRate: number;
  totalTokensIn: number;
  totalTokensOut: number;
  byAcao: Array<{ key: string; count: number }>;
  byModelo: Array<{ key: string; count: number }>;
}

export interface SlaStats {
  cumpridas: number;
  violadas: number;
  cumprimentoPct: number | null;
  tempoMedioHoras: number | null;
  porPrioridade: Array<{ priority: DemandPriority; cumprimentoPct: number | null; total: number }>;
}

export interface RoutingStats {
  candidatos: number;
  ativos: number;
  cargaMedia: number;
  cargaMax: number;
  distribuicao: Array<{ user_id: string; nome: string | null; carga: number }>;
}

export interface AnalyticsResult {
  demandsFiltered: Demand[];
  totalOpen: number;
  totalClosed: number;
  trend: TrendPoint[];
  devs: DevRow[];
  systems: SystemRow[];
  workflows: WorkflowStats;
  knowledge: KnowledgeStats;
  ai: AiStats;
  sla: SlaStats;
  routing: RoutingStats;
}
