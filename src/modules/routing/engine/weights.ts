import type { Weights } from "../types";

/** Pesos default — soma = 100. Ajustáveis via parâmetro em `rankCandidates`. */
export const DEFAULT_WEIGHTS: Weights = {
  specialty: 25,
  workload: 20,
  speed: 15,
  history: 10,
  complexity: 10,
  priority: 10,
  sla: 10,
};

export function normalizeWeights(w: Partial<Weights> = {}): Weights {
  const merged = { ...DEFAULT_WEIGHTS, ...w };
  const sum =
    merged.specialty +
    merged.workload +
    merged.speed +
    merged.history +
    merged.complexity +
    merged.priority +
    merged.sla;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  const factor = 100 / sum;
  return {
    specialty: merged.specialty * factor,
    workload: merged.workload * factor,
    speed: merged.speed * factor,
    history: merged.history * factor,
    complexity: merged.complexity * factor,
    priority: merged.priority * factor,
    sla: merged.sla * factor,
  };
}
