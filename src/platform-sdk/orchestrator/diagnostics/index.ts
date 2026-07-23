/**
 * Orchestrator diagnostics.
 */
import { orchestratorRegistry } from "../executor";
import { listChains, listPlans } from "../chains";
import { DEFAULT_POLICIES } from "../policies";

export interface OrchestratorDiagnostics {
  extensions: {
    planners: number;
    selectors: number;
    pipelines: number;
    policies: number;
  };
  policies: string[];
  recentPlans: number;
  recentChains: number;
  successRate: number;
  avgDurationMs: number;
}

export function collectOrchestratorDiagnostics(): OrchestratorDiagnostics {
  const chains = listChains();
  const okCount = chains.filter((c) => c.status === "ok").length;
  const avg =
    chains.length === 0
      ? 0
      : chains.reduce((s, c) => s + (c.totalDurationMs ?? 0), 0) / chains.length;
  return {
    extensions: {
      planners: orchestratorRegistry.planners().length,
      selectors: orchestratorRegistry.selectors().length,
      pipelines: orchestratorRegistry.pipelines().length,
      policies: orchestratorRegistry.policies().length,
    },
    policies: [
      ...DEFAULT_POLICIES.map((p) => p.id),
      ...orchestratorRegistry.policies().map((p) => p.id),
    ],
    recentPlans: listPlans().length,
    recentChains: chains.length,
    successRate: chains.length ? okCount / chains.length : 0,
    avgDurationMs: avg,
  };
}
