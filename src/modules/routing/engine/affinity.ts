/**
 * Deriva histórico e métricas de resolução de cada candidato a partir de
 * uma amostra de demandas resolvidas. Puro; sem I/O.
 *
 * F018.4 — agora também agrega histórico por sistema do Ecossistema.
 * A entrada `resolved` continua sendo o vetor bruto de `demands` concluídas.
 * O mapa opcional `systemKey`/`docsBySystem` permite ao chamador traduzir
 * `system_id → slug` e injetar contagem de artigos escritos por candidato.
 */
import type { Demand, DemandSlaStatus } from "@/modules/demands/types";
import type { Candidate, SystemHistoryEntry } from "../types";

export interface HistoryDerived {
  type_history: Candidate["type_history"];
  priority_history: Candidate["priority_history"];
  complexity_history: Candidate["complexity_history"];
  system_history: SystemHistoryEntry[];
  resolved_count: number;
  avg_resolution_h: number | null;
}

export interface DeriveHistoryOptions {
  /** Tradução `system_id → slug`. Quando ausente, usa `system_id` cru. */
  systemKey?: (systemId: string) => string | null;
  /** Docs escritos pelo usuário, agrupados por slug do sistema. */
  docsBySystem?: Map<string, number>;
}

function isSuccess(sla: DemandSlaStatus | null | undefined): boolean {
  return sla === "cumprido" || sla === "no_prazo" || sla == null;
}

export function deriveHistory(
  userId: string,
  resolved: Demand[],
  options: DeriveHistoryOptions = {},
): HistoryDerived {
  const mine = resolved.filter(
    (d) => d.assigned_to === userId && d.status === "concluido",
  );
  const type_history: Candidate["type_history"] = {};
  const priority_history: Candidate["priority_history"] = {};
  const complexity_history: Candidate["complexity_history"] = {};
  const systemAgg = new Map<
    string,
    { total: number; success: number; hoursTotal: number; hoursSamples: number }
  >();
  let totalHours = 0;
  let samples = 0;

  for (const d of mine) {
    type_history[d.type] = (type_history[d.type] ?? 0) + 1;
    priority_history[d.priority] = (priority_history[d.priority] ?? 0) + 1;
    complexity_history[d.complexity] = (complexity_history[d.complexity] ?? 0) + 1;
    const start = new Date(d.created_at).getTime();
    const end = new Date(d.updated_at).getTime();
    const hasHours = Number.isFinite(start) && Number.isFinite(end) && end > start;
    const hours = hasHours ? (end - start) / (1000 * 60 * 60) : 0;
    if (hasHours) {
      totalHours += hours;
      samples += 1;
    }

    if (d.system_id) {
      const slug = options.systemKey ? options.systemKey(d.system_id) : d.system_id;
      if (slug) {
        const cur = systemAgg.get(slug) ?? {
          total: 0,
          success: 0,
          hoursTotal: 0,
          hoursSamples: 0,
        };
        cur.total += 1;
        if (isSuccess(d.sla_status)) cur.success += 1;
        if (hasHours) {
          cur.hoursTotal += hours;
          cur.hoursSamples += 1;
        }
        systemAgg.set(slug, cur);
      }
    }
  }

  const system_history: SystemHistoryEntry[] = Array.from(systemAgg.entries())
    .map(([slug, v]) => ({
      slug,
      total: v.total,
      success: v.success,
      avg_resolution_h: v.hoursSamples > 0 ? v.hoursTotal / v.hoursSamples : 0,
      documentation: options.docsBySystem?.get(slug) ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    type_history,
    priority_history,
    complexity_history,
    system_history,
    resolved_count: mine.length,
    avg_resolution_h: samples > 0 ? totalHours / samples : null,
  };
}
