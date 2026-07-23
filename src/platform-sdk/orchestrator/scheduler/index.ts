/**
 * Scheduler — executa steps do plano. Sequential/Parallel/Pipeline em memória.
 * Suporta retry lógico, timeout lógico e cancelamento via AbortSignal.
 */
import type { AiExecutionResult, AiInvocationContext } from "../../ai-sdk/types";
import { runSkill } from "../../ai-sdk/skills";
import { runTool } from "../../ai-sdk/tools";
import { runAgent } from "../../ai-sdk/agents";
import { aiExtensionRegistry } from "../../ai-sdk/registry";
import type {
  ExecutionChain,
  ExecutionPlan,
  ExecutionStep,
  PipelineStepSpec,
} from "../types";

export interface ScheduleOptions {
  ctx: AiInvocationContext;
  input?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
}

let chainCounter = 0;

function newChainId(planId: string): string {
  chainCounter += 1;
  return `chain_${planId}_${chainCounter}`;
}

async function withTimeout<T>(
  p: Promise<T>,
  ms: number | undefined,
  onTimeout: () => T
): Promise<T> {
  if (!ms) return p;
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms);
    p.then((v) => {
      clearTimeout(timer);
      resolve(v);
    }).catch(() => {
      clearTimeout(timer);
      resolve(onTimeout());
    });
  });
}

async function executeStep(
  step: PipelineStepSpec,
  opts: ScheduleOptions
): Promise<{ result: AiExecutionResult; health?: "ok" | "degraded" | "down" }> {
  const timeoutMs = opts.timeoutMs;
  const retries = Math.max(0, opts.retries ?? 0);

  const invoke = async (): Promise<AiExecutionResult> => {
    switch (step.kind) {
      case "skill":
        return runSkill(step.refId!, { input: opts.input, ctx: opts.ctx }, opts.ctx);
      case "tool":
        return runTool(step.refId!, { input: opts.input, ctx: opts.ctx }, opts.ctx);
      case "agent":
        return runAgent(step.refId!, opts.input ?? "", opts.ctx);
      case "prompt":
      case "context":
      case "planner":
      case "memory":
      case "output":
      case "custom":
        return { ok: true, output: { kind: step.kind, ref: step.refId } };
      default:
        return { ok: false, error: `unknown-step-kind:${(step as { kind: string }).kind}` };
    }
  };

  let last: AiExecutionResult = { ok: false, error: "no-attempt" };
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) {
      return { result: { ok: false, error: "cancelled" } };
    }
    last = await withTimeout(invoke(), timeoutMs, () => ({
      ok: false,
      error: `timeout-${timeoutMs}ms`,
    }));
    if (last.ok) break;
  }

  // Health read
  let health: "ok" | "degraded" | "down" | undefined;
  try {
    if (step.kind === "skill") {
      health = aiExtensionRegistry.get("skill", step.refId!)?.health?.();
    } else if (step.kind === "tool") {
      health = aiExtensionRegistry.get("tool", step.refId!)?.health?.();
    } else if (step.kind === "agent") {
      health = aiExtensionRegistry.get("agent", step.refId!)?.health?.();
    }
  } catch {
    /* ignore */
  }

  return { result: last, health };
}

export async function scheduleExecution(
  plan: ExecutionPlan,
  opts: ScheduleOptions
): Promise<ExecutionChain> {
  const startedAt = Date.now();
  const chain: ExecutionChain = {
    id: newChainId(plan.id),
    planId: plan.id,
    startedAt,
    status: "running",
    steps: plan.pipeline.map<ExecutionStep>((spec) => ({
      spec,
      status: "pending",
    })),
  };

  // Group by parallelGroup preserving order
  const groups: Array<{ key: string; steps: number[] }> = [];
  chain.steps.forEach((s, idx) => {
    const key = s.spec.parallelGroup ?? `__seq_${idx}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.steps.push(idx);
    else groups.push({ key, steps: [idx] });
  });

  try {
    for (const group of groups) {
      if (opts.signal?.aborted) {
        chain.status = "cancelled";
        break;
      }
      const runIdx = async (idx: number) => {
        const step = chain.steps[idx];
        step.status = "running";
        step.startedAt = Date.now();
        const { result, health } = await executeStep(step.spec, opts);
        step.durationMs = Date.now() - step.startedAt;
        step.health = health;
        if (result.ok) {
          step.status = "ok";
          step.output = result.output;
        } else {
          step.status = "error";
          step.error = result.error;
        }
      };
      if (group.steps.length === 1) {
        await runIdx(group.steps[0]);
      } else {
        await Promise.all(group.steps.map(runIdx));
      }
    }

    const hadError = chain.steps.some((s) => s.status === "error" && !s.spec.optional);
    chain.status = chain.status === "cancelled" ? "cancelled" : hadError ? "error" : "ok";

    // Compose final output from last non-error step
    const last = [...chain.steps].reverse().find((s) => s.status === "ok" && s.output !== undefined);
    chain.finalOutput = last?.output;
    if (hadError) {
      chain.error = chain.steps.find((s) => s.status === "error")?.error;
    }
  } catch (err) {
    chain.status = "error";
    chain.error = String((err as Error)?.message ?? err);
  } finally {
    chain.endedAt = Date.now();
    chain.totalDurationMs = chain.endedAt - startedAt;
  }

  return chain;
}
