import { meshEventHistory } from "@/platform-sdk/services/diagnostics";
import { collectPerformance, collectRuntimeHealth } from "@/modules/platform-health";
import { collectObservabilityOverview } from "@/modules/observability";

export interface IntegrationDiagnostics {
  timeouts: number;
  retries: number;
  fallbacks: number;
  queueDepth: number;
  errors: number;
  healthScore: number;
  avgLatencyMs: number;
  availabilityPct: number;
}

function safe<T>(fn: () => T, fb: T): T {
  try { return fn(); } catch { return fb; }
}

/**
 * Health score aditivo: 100 − penalidade por runtimes vermelhos/âmbar e erros.
 * Availability: proporção de runtimes green vs total. Latência: média do mesh.
 */
export function getIntegrationDiagnostics(): IntegrationDiagnostics {
  const events = safe(() => meshEventHistory(), []);
  const timeouts = events.filter((e) => e.kind === "consumer.required-failed" || /timeout/i.test(e.detail ?? "")).length;
  const retries = events.filter((e) => /retry|reintent/i.test(e.detail ?? "")).length;
  const fallbacks = events.filter((e) => e.kind === "consumer.optional-missed").length;
  const errors = events.filter((e) => e.kind === "capability.denied" || e.kind === "version.incompatible" || e.kind === "consumer.required-failed").length;

  const runtimes = safe(collectRuntimeHealth, []);
  const green = runtimes.filter((r) => r.status === "green").length;
  const total = runtimes.length || 1;
  const amber = runtimes.filter((r) => r.status === "amber").length;
  const red = runtimes.filter((r) => r.status === "red").length;
  const availability = green / total;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - amber * 8 - red * 20 - Math.min(20, errors))));

  const perf = safe(collectPerformance, []);
  const avg = perf.length ? Math.round(perf.reduce((s, p) => s + p.avgMs, 0) / perf.length) : 0;

  const obs = safe(collectObservabilityOverview, null);
  const queueDepth = obs?.traces ?? 0;

  return {
    timeouts,
    retries,
    fallbacks,
    queueDepth,
    errors,
    healthScore,
    avgLatencyMs: avg,
    availabilityPct: Math.round(availability * 1000) / 10,
  };
}
