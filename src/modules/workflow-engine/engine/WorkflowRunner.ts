/**
 * WorkflowRunner — executa um ExecutionPlan.
 * dryRun: não chama adapters, apenas materializa o plano como "mocked".
 * live:   chama adapters (que nesta Feature são MOCKS).
 */
import type { EngineAdapters } from "../adapters/interfaces";
import { createMockAdapters } from "../adapters/mocks";
import type {
  EngineContext,
  ExecutionPlan,
  ExecutionResult,
  StepOutcome,
} from "../types";
import { getExecutor } from "../registry/ActionRegistry";

export interface RunOptions {
  adapters?: EngineAdapters;
  ctx: EngineContext;
}

export class WorkflowRunner {
  async run(plan: ExecutionPlan, opts: RunOptions): Promise<ExecutionResult> {
    const startedAt = new Date().toISOString();
    const start = Date.now();
    const outcomes: StepOutcome[] = [];

    const canRunLive =
      plan.mode === "live" &&
      plan.matched &&
      plan.validationErrors.length === 0;

    const adapters = opts.adapters ?? createMockAdapters();

    for (const step of plan.steps) {
      const stepStart = Date.now();
      if (!plan.matched) {
        outcomes.push({
          stepId: step.id,
          actionType: step.action.type,
          status: "skipped",
          message: "Condições não atendidas",
          durationMs: 0,
        });
        continue;
      }
      if (plan.mode === "dryRun") {
        outcomes.push({
          stepId: step.id,
          actionType: step.action.type,
          status: "mocked",
          message: step.reason,
          durationMs: Date.now() - stepStart,
        });
        continue;
      }
      if (!canRunLive) {
        outcomes.push({
          stepId: step.id,
          actionType: step.action.type,
          status: "skipped",
          message: "Bloqueado por validação",
          durationMs: 0,
        });
        continue;
      }
      const exec = getExecutor(step.action.type);
      if (!exec) {
        outcomes.push({
          stepId: step.id,
          actionType: step.action.type,
          status: "error",
          message: `Sem executor para ${step.action.type}`,
          durationMs: Date.now() - stepStart,
        });
        continue;
      }
      try {
        const output = await exec.execute(
          step.action,
          { engine: opts.ctx, workflowId: plan.workflowId, stepId: step.id },
          adapters,
        );
        outcomes.push({
          stepId: step.id,
          actionType: step.action.type,
          status: "ok",
          message: step.reason,
          durationMs: Date.now() - stepStart,
          output,
        });
      } catch (err) {
        outcomes.push({
          stepId: step.id,
          actionType: step.action.type,
          status: "error",
          message: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - stepStart,
        });
      }
    }

    const finishedAt = new Date().toISOString();
    const succeeded =
      plan.matched &&
      outcomes.every((o) => o.status === "ok" || o.status === "mocked");

    return {
      plan,
      outcomes,
      succeeded,
      startedAt,
      finishedAt,
      totalMs: Date.now() - start,
    };
  }
}

export const workflowRunner = new WorkflowRunner();
