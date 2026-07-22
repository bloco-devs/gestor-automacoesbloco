/**
 * Deriva histórico e métricas de resolução de cada candidato a partir de
 * uma amostra de demandas resolvidas. Puro; sem I/O.
 */
import type { Demand } from "@/modules/demands/types";
import type { Candidate } from "../types";

export interface HistoryDerived {
  type_history: Candidate["type_history"];
  priority_history: Candidate["priority_history"];
  complexity_history: Candidate["complexity_history"];
  resolved_count: number;
  avg_resolution_h: number | null;
}

export function deriveHistory(userId: string, resolved: Demand[]): HistoryDerived {
  const mine = resolved.filter((d) => d.assigned_to === userId && d.status === "concluido");
  const type_history: Candidate["type_history"] = {};
  const priority_history: Candidate["priority_history"] = {};
  const complexity_history: Candidate["complexity_history"] = {};
  let totalHours = 0;
  let samples = 0;

  for (const d of mine) {
    type_history[d.type] = (type_history[d.type] ?? 0) + 1;
    priority_history[d.priority] = (priority_history[d.priority] ?? 0) + 1;
    complexity_history[d.complexity] = (complexity_history[d.complexity] ?? 0) + 1;
    const start = new Date(d.created_at).getTime();
    const end = new Date(d.updated_at).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      totalHours += (end - start) / (1000 * 60 * 60);
      samples += 1;
    }
  }

  return {
    type_history,
    priority_history,
    complexity_history,
    resolved_count: mine.length,
    avg_resolution_h: samples > 0 ? totalHours / samples : null,
  };
}
