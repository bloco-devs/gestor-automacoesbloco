/**
 * ConditionEvaluator — reusa o simulador puro do Workflow Builder.
 * Não duplica lógica de AND/OR/NOT.
 */
import type {
  ConditionGroup,
  WorkflowDefinition,
} from "@/modules/workflow-builder/types";
import { simulateWorkflow } from "@/modules/workflow-builder/utils/simulator";
import type { EngineContext } from "../types";

export interface ConditionEvaluation {
  matched: boolean;
  matchedNodes: string[];
  unmatchedNodes: string[];
}

export function evaluateConditions(
  wf: WorkflowDefinition,
  ctx: EngineContext,
): ConditionEvaluation {
  // simulateWorkflow já cobre grupos aninhados, NOT/AND/OR e operadores.
  const r = simulateWorkflow(wf, ctx);
  return {
    matched: r.matched,
    matchedNodes: r.matchedNodes,
    unmatchedNodes: r.unmatchedNodes,
  };
}

/** Utilidade — avalia um grupo isolado (útil para testes). */
export function evaluateGroup(
  group: ConditionGroup,
  ctx: EngineContext,
  wf: WorkflowDefinition,
): ConditionEvaluation {
  const cloned: WorkflowDefinition = { ...wf, conditions: group };
  return evaluateConditions(cloned, ctx);
}
