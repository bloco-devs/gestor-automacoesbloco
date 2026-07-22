/**
 * WorkflowEngine — recebe Workflow + Contexto, devolve ExecutionPlan.
 * Puro, síncrono, sem efeitos colaterais.
 */
import type { WorkflowDefinition } from "@/modules/workflow-builder/types";
import type { EngineContext, ExecutionMode, ExecutionPlan, ExecutionStep } from "../types";
import { evaluateConditions } from "./ConditionEvaluator";
import { getExecutor } from "../registry/ActionRegistry";
import { validateForEngine } from "../validators/WorkflowValidator";

export interface PlanOptions {
  mode?: ExecutionMode;
  now?: string;
}

export class WorkflowEngine {
  plan(
    wf: WorkflowDefinition,
    ctx: EngineContext,
    opts: PlanOptions = {},
  ): ExecutionPlan {
    const mode = opts.mode ?? "dryRun";
    const validation = validateForEngine(wf).map((e) => `${e.path}: ${e.message}`);
    const evaluation = evaluateConditions(wf, ctx);

    const steps: ExecutionStep[] = evaluation.matched
      ? wf.actions.map((a) => {
          const exec = getExecutor(a.type);
          const reason = exec ? exec.describe(a) : `Ação ${a.type} sem executor`;
          return { id: a.id, action: a, reason };
        })
      : [];

    return {
      workflowId: wf.id,
      workflowVersion: wf.version,
      mode,
      matched: evaluation.matched,
      matchedNodes: evaluation.matchedNodes,
      unmatchedNodes: evaluation.unmatchedNodes,
      steps,
      validationErrors: validation,
      createdAt: opts.now ?? new Date().toISOString(),
    };
  }
}

export const workflowEngine = new WorkflowEngine();
