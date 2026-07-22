/**
 * Simulação — reusa a mesma engine, sempre em dryRun.
 * Substitui a lógica local dos consumidores; ainda retorna o shape
 * do SimulationResult original para compatibilidade.
 */
import type {
  SimulationSample,
  WorkflowDefinition,
} from "@/modules/workflow-builder/types";
import { workflowEngine } from "../engine/WorkflowEngine";
import type { EngineSimulationResult } from "../types";

export function simulate(
  wf: WorkflowDefinition,
  sample: SimulationSample,
): EngineSimulationResult {
  const plan = workflowEngine.plan(wf, sample, { mode: "dryRun" });
  return {
    matched: plan.matched,
    matchedNodes: plan.matchedNodes,
    unmatchedNodes: plan.unmatchedNodes,
    plannedActions: plan.steps.map((s) => s.action),
    plan,
  };
}
