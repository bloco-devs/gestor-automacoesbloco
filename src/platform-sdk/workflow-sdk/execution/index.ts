/**
 * Execution helpers — orquestram hooks + action/trigger de forma segura.
 * Nunca lança. Cada hook é isolado (falha de hook não derruba execução).
 */
import type {
  WorkflowAction,
  WorkflowActionContext,
  WorkflowActionResult,
  WorkflowTrigger,
  WorkflowTriggerContext,
  WorkflowHook,
  HookContext,
} from "../types";
import { workflowExtensionRegistry } from "../registry";

async function fireHook(
  hook: WorkflowHook,
  phase: HookContext["phase"],
  ctx: Omit<HookContext, "phase">
) {
  const fn = hook[phase];
  if (!fn) return;
  try {
    await fn({ ...ctx, phase });
  } catch (err) {
    // Hooks são best-effort.
    hook.beforeExecute; // no-op reference to keep TS happy
    (ctx.logger ?? (() => {}))(`[hook:${hook.id}] falhou em ${phase}`, err);
  }
}

async function runAllHooks(phase: HookContext["phase"], base: Omit<HookContext, "phase">) {
  const hooks = workflowExtensionRegistry.hooks();
  for (const h of hooks) await fireHook(h, phase, base);
}

export interface RunActionOptions {
  runId?: string;
  payload?: Record<string, unknown>;
  logger?: (msg: string, meta?: unknown) => void;
}

export async function runAction(
  action: WorkflowAction,
  opts: RunActionOptions = {}
): Promise<WorkflowActionResult> {
  const runId = opts.runId ?? `run_${Date.now().toString(36)}`;
  const logger = opts.logger ?? (() => {});
  const payload = opts.payload ?? {};
  const base = { runId, actionId: action.id, payload, logger };
  await runAllHooks("beforeAction", base);
  const ctx: WorkflowActionContext = {
    now: Date.now(),
    logger,
    emit: () => {},
  };
  let result: WorkflowActionResult;
  try {
    result = await action.execute(ctx, payload);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    result = { ok: false, error };
    await runAllHooks("onError", { ...base, error });
  }
  await runAllHooks("afterAction", { ...base, payload: result.output });
  return result;
}

export interface RunTriggerOptions {
  runId?: string;
  payload?: Record<string, unknown>;
  logger?: (msg: string, meta?: unknown) => void;
}

export async function runTrigger(
  trigger: WorkflowTrigger,
  opts: RunTriggerOptions = {}
) {
  const runId = opts.runId ?? `trg_${Date.now().toString(36)}`;
  const logger = opts.logger ?? (() => {});
  const base = { runId, actionId: trigger.id, payload: opts.payload, logger };
  await runAllHooks("beforeExecute", base);
  const ctx: WorkflowTriggerContext = {
    now: Date.now(),
    logger,
    emit: () => {},
  };
  try {
    const out = await trigger.execute(ctx, opts.payload);
    await runAllHooks("afterExecute", { ...base, payload: out });
    return { ok: true as const, output: out };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await runAllHooks("onError", { ...base, error });
    return { ok: false as const, error };
  }
}

export async function cancelRun(runId: string, reason?: string) {
  await runAllHooks("onCancel", { runId, logger: () => {}, payload: { reason } });
}
