import { useSyncExternalStore } from "react";
import { orchestratorRegistry } from "../executor";
import { listChains, listPlans, subscribeChains } from "../chains";
import { collectOrchestratorDiagnostics, type OrchestratorDiagnostics } from "../diagnostics";
import type { ExecutionChain, ExecutionPlan, OrchestratorExtension } from "../types";
import { stableSnapshot } from "@/lib/stable-snapshot";

const getExtensions = stableSnapshot(() => orchestratorRegistry.listAll());
const getPlans = stableSnapshot(listPlans);
const getChains = stableSnapshot(listChains);
const getDiagnostics = stableSnapshot(collectOrchestratorDiagnostics);

export function useOrchestratorExtensions(): OrchestratorExtension[] {
  return useSyncExternalStore(
    (l) => orchestratorRegistry.subscribe(l),
    getExtensions,
    getExtensions,
  );
}
export function useOrchestratorPlans(): ExecutionPlan[] {
  return useSyncExternalStore(subscribeChains, getPlans, getPlans);
}
export function useOrchestratorChains(): ExecutionChain[] {
  return useSyncExternalStore(subscribeChains, getChains, getChains);
}
export function useOrchestratorDiagnostics(): OrchestratorDiagnostics {
  return useSyncExternalStore(subscribeChains, getDiagnostics, getDiagnostics);
}
