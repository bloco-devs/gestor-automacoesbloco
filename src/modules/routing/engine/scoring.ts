/**
 * Scoring puro — cada função retorna 0..1.
 * Sem side-effects, sem I/O.
 */
import type { Candidate, DemandInput } from "../types";
import type { DemandPriority, DemandComplexity } from "@/modules/demands/types";

/** Afinidade por tipo — proporção de resolvidos do mesmo tipo, com boost. */
export function scoreSpecialty(demand: DemandInput, c: Candidate): number {
  const total = c.resolved_count;
  if (total <= 0) return 0.25; // neutro para candidatos novos
  const same = c.type_history[demand.type] ?? 0;
  const ratio = same / total;
  // saturating: 30% do histórico no tipo já é forte
  return Math.min(1, ratio / 0.3);
}

/**
 * Carga invertida — 0 ativas => 1; medianRef ativa => 0.5; >=2*medianRef => 0.
 * `medianRef` é a mediana da equipe (fallback 3).
 */
export function scoreWorkload(c: Candidate, medianRef: number): number {
  const ref = Math.max(1, medianRef);
  const ratio = c.active_count / ref;
  if (ratio <= 0) return 1;
  if (ratio >= 2) return 0;
  return 1 - ratio / 2;
}

/** Velocidade — 1 quando avg é o melhor do grupo; 0 quando é o pior. */
export function scoreSpeed(c: Candidate, bestH: number | null, worstH: number | null): number {
  if (c.avg_resolution_h == null || bestH == null || worstH == null) return 0.5;
  if (worstH <= bestH) return 1;
  const clamped = Math.min(worstH, Math.max(bestH, c.avg_resolution_h));
  return 1 - (clamped - bestH) / (worstH - bestH);
}

/** Histórico — quanto mais resolvidos, mais confiável (saturating em 20). */
export function scoreHistory(c: Candidate): number {
  return Math.min(1, c.resolved_count / 20);
}

const COMPLEXITY_RANK: Record<DemandComplexity, number> = {
  facil: 1,
  media: 2,
  dificil: 3,
};

/** Compatibilidade de complexidade — favorece quem já atendeu a mesma ou superior. */
export function scoreComplexityFit(demand: DemandInput, c: Candidate): number {
  const target = COMPLEXITY_RANK[demand.complexity];
  let weighted = 0;
  let total = 0;
  for (const [k, count] of Object.entries(c.complexity_history) as Array<[DemandComplexity, number]>) {
    total += count;
    weighted += count * (COMPLEXITY_RANK[k] >= target ? 1 : 0.5);
  }
  if (total === 0) return 0.4;
  return weighted / total;
}

const PRIORITY_RANK: Record<DemandPriority, number> = {
  baixa: 1,
  media: 2,
  alta: 3,
  critica: 4,
};

/** Compatibilidade de prioridade — favorece quem já lidou com prioridade igual/maior. */
export function scorePriorityFit(demand: DemandInput, c: Candidate): number {
  const target = PRIORITY_RANK[demand.priority];
  let weighted = 0;
  let total = 0;
  for (const [k, count] of Object.entries(c.priority_history) as Array<[DemandPriority, number]>) {
    total += count;
    weighted += count * (PRIORITY_RANK[k] >= target ? 1 : 0.4);
  }
  if (total === 0) return 0.4;
  return weighted / total;
}

/**
 * SLA — quando SLA está apertado, favorece quem tem folga (menos carga).
 * Reforça o sinal de workload proporcionalmente à urgência.
 */
export function scoreSlaFit(demand: DemandInput, workloadNorm: number): number {
  const urgency = demand.sla_status === "estourado" ? 1 : demand.sla_status === "atencao" ? 0.7 : 0.3;
  return urgency * workloadNorm + (1 - urgency) * 0.6;
}
