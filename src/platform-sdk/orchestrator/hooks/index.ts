import { useSyncExternalStore } from "react";
import { orchestratorRegistry } from "../executor";
import { listChains, listPlans, subscribeChains } from "../chains";
import { collectOrchestratorDiagnostics, type OrchestratorDiagnostics } from "../diagnostics";
import type { ExecutionChain, ExecutionPlan, OrchestratorExtension } from "../types";

export function useOrchestratorExtensions(): OrchestratorExtension[] {
  return useSyncExternalStore(
    (l) => orchestratorRegistry.subscribe(l),
    () => orchestratorRegistry.listAll(),
    () => orchestratorRegistry.listAll()
  );
}
export function useOrchestratorPlans(): ExecutionPlan[] {
  return useSyncExternalStore(subscribeChains, listPlans, listPlans);
}
export function useOrchestratorChains(): ExecutionChain[] {
  return useSyncExternalStore(subscribeChains, listChains, listChains);
}
export function useOrchestratorDiagnostics(): OrchestratorDiagnostics {
  return useSyncExternalStore(
    subscribeChains,
    collectOrchestratorDiagnostics,
    collectOrchestratorDiagnostics
  );
}
