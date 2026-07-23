/**
 * Ranker — orquestra scoring de cada candidato, aplica pesos e desempate.
 * Puro; sem side-effects.
 */
import type {
  Candidate,
  ConfidenceLevel,
  DemandInput,
  Ranking,
  ScoredCandidate,
  Weights,
} from "../types";
import { DEFAULT_WEIGHTS, normalizeWeights } from "./weights";
import {
  scoreComplexityFit,
  scoreHistory,
  scorePriorityFit,
  scoreSlaFit,
  scoreSpecialty,
  scoreSpeed,
  scoreWorkload,
} from "./scoring";
import { findSystemEntry, scoreSystemFit } from "./system-fit";
import { TYPE_META } from "@/modules/demands/types";

const EMPTY: Ranking = { top: null, alternatives: [], all: [], empty: true };

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function confidenceOf(score: number, gap: number): ConfidenceLevel {
  if (score >= 80 && gap >= 5) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function buildReasons(demand: DemandInput, c: Candidate, workloadNorm: number): string[] {
  const reasons: string[] = [];
  const typeLabel = TYPE_META[demand.type]?.label ?? demand.type;
  const same = c.type_history[demand.type] ?? 0;
  if (same >= 3) reasons.push(`Especialista em ${typeLabel} (${same} resolvidas)`);
  else if (same > 0) reasons.push(`Já atendeu ${same} de ${typeLabel}`);

  reasons.push(
    c.active_count === 0
      ? "Sem demandas ativas"
      : `Carga ${c.active_count} ativa${c.active_count > 1 ? "s" : ""}`,
  );

  if (c.avg_resolution_h != null && c.avg_resolution_h > 0) {
    const h = c.avg_resolution_h;
    const label = h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`;
    reasons.push(`Tempo médio ${label}`);
  }
  if (workloadNorm >= 0.8 && (demand.sla_status === "atencao" || demand.sla_status === "estourado")) {
    reasons.push("Tem folga para SLA urgente");
  }
  return reasons;
}

export interface RankOptions {
  weights?: Partial<Weights>;
  eligible?: (c: Candidate) => boolean;
  maxAlternatives?: number;
}

export function rankCandidates(
  demand: DemandInput,
  pool: Candidate[],
  options: RankOptions = {},
): Ranking {
  if (!pool || pool.length === 0) return { ...EMPTY };

  const filter = options.eligible ?? (() => true);
  const eligible = pool.filter(filter);
  const workingPool = eligible.length > 0 ? eligible : pool; // fallback: usa todos

  const weights = normalizeWeights(options.weights ?? DEFAULT_WEIGHTS);
  const medianRef = median(workingPool.map((c) => c.active_count));
  const speedSamples = workingPool
    .map((c) => c.avg_resolution_h)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  const bestH = speedSamples.length ? Math.min(...speedSamples) : null;
  const worstH = speedSamples.length ? Math.max(...speedSamples) : null;

  const scored: ScoredCandidate[] = workingPool.map((c) => {
    const specialty = scoreSpecialty(demand, c);
    const workload = scoreWorkload(c, medianRef);
    const speed = scoreSpeed(c, bestH, worstH);
    const history = scoreHistory(c);
    const complexity = scoreComplexityFit(demand, c);
    const priority = scorePriorityFit(demand, c);
    const sla = scoreSlaFit(demand, workload);
    // F018.4 — bônus aditivo (0..10) que NUNCA substitui o algoritmo base.
    const systemFit = demand.system_slug ? scoreSystemFit(demand, c) : 0;

    const breakdown = { specialty, workload, speed, history, complexity, priority, sla, systemFit };
    const raw =
      specialty * weights.specialty +
      workload * weights.workload +
      speed * weights.speed +
      history * weights.history +
      complexity * weights.complexity +
      priority * weights.priority +
      sla * weights.sla;
    const score = Math.round(raw) + systemFit;
    const reasons = buildReasons(demand, c, workload);
    // Reason de especialista no sistema (quando aplicável)
    if (demand.system_slug) {
      const entry = findSystemEntry(demand, c);
      if (entry && entry.total >= 3) {
        reasons.unshift(
          `Especialista neste sistema (${entry.total} demanda${entry.total > 1 ? "s" : ""})`,
        );
      } else if (entry && entry.total > 0) {
        reasons.unshift(`Já atendeu ${entry.total} no sistema`);
      }
    }
    return { candidate: c, score, breakdown, reasons, confidence: "low" as ConfidenceLevel };
  });

  // Ordenação estável com desempates
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.candidate.active_count !== b.candidate.active_count)
      return a.candidate.active_count - b.candidate.active_count;
    const affA = a.candidate.type_history[demand.type] ?? 0;
    const affB = b.candidate.type_history[demand.type] ?? 0;
    if (affB !== affA) return affB - affA;
    const spA = a.candidate.avg_resolution_h ?? Number.POSITIVE_INFINITY;
    const spB = b.candidate.avg_resolution_h ?? Number.POSITIVE_INFINITY;
    if (spA !== spB) return spA - spB;
    return a.candidate.user_id.localeCompare(b.candidate.user_id);
  });

  // Confiança
  const top = scored[0] ?? null;
  const second = scored[1] ?? null;
  if (top) {
    const gap = top.score - (second?.score ?? 0);
    top.confidence = confidenceOf(top.score, gap);
    for (let i = 1; i < scored.length; i++) {
      scored[i].confidence = confidenceOf(scored[i].score, 0);
    }
  }

  const max = options.maxAlternatives ?? 4;
  return {
    top,
    alternatives: scored.slice(1, 1 + max),
    all: scored,
    empty: false,
  };
}
