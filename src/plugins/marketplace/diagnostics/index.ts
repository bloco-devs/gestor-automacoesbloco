/**
 * Diagnostics — Health por plugin. Puro.
 */
import type { HostDiagnostics } from "@/platform-sdk/runtime/host";
import type { CatalogEntry, PluginHealth } from "../types";

export function computeHealth(
  entry: CatalogEntry,
  diag: HostDiagnostics
): PluginHealth {
  const events = diag.lifecycleEvents.filter((e) => e.pluginId === entry.id);
  const errorCount = events.filter((e) => e.error).length;
  const lastEventAt = events.length ? events[events.length - 1].at : null;
  const loadTimeMs = entry.record?.initMs ?? 0;

  // Estimativa heurística de memória: baseada em manifest surface.
  const memoryEstimateKb =
    2 + entry.commands * 0.5 + entry.widgets * 1.2 + entry.dependencies.length * 0.3;

  let lifecycleState: PluginHealth["lifecycleState"] = "pending";
  if (entry.status === "active") lifecycleState = "active";
  else if (entry.status === "loaded") lifecycleState = "loaded";
  else if (entry.status === "disabled") lifecycleState = "disabled";
  else if (entry.status === "error" || entry.status === "rejected") lifecycleState = "error";

  return {
    id: entry.id,
    status: entry.status,
    lifecycleState,
    loadTimeMs,
    memoryEstimateKb: Math.round(memoryEstimateKb * 10) / 10,
    commands: entry.commands,
    widgets: entry.widgets,
    eventListeners: 0, // SDK atual não expõe listeners; reservado.
    warnings: entry.warnings,
    errorCount,
    lastEventAt,
  };
}
