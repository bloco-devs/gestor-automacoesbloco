/**
 * AI Orchestrator — public runtime.
 * Recebe contexto, monta plano, executa scheduler, retorna cadeia + saída.
 */
import type { AiInvocationContext } from "../../ai-sdk/types";
import type {
  ExecutionPlan,
  OrchestrateOptions,
  OrchestrateResult,
  OrchestratorExtension,
  OrchestratorExtensionKind,
  OrchestratorPlanner,
  OrchestratorPipeline,
  OrchestratorSelector,
  ExecutionPolicy,
} from "../types";
import { runPlanners } from "../planner";
import { resolvePolicy } from "../policies";
import { scheduleExecution } from "../scheduler";
import { recordChain, recordPlan } from "../chains";

type Listener = () => void;

class OrchestratorRegistry {
  private items = new Map<string, OrchestratorExtension>();
  private listeners = new Set<Listener>();

  private key(k: OrchestratorExtensionKind, id: string) {
    return `${k}:${id}`;
  }

  register(ext: OrchestratorExtension): () => void {
    if (!ext?.id || !ext?.kind || !ext?.pluginId) return () => {};
    this.items.set(this.key(ext.kind, ext.id), ext);
    this.emit();
    return () => this.unregister(ext.kind, ext.id);
  }
  registerAll(exts: OrchestratorExtension[]): () => void {
    const ds = exts.map((e) => this.register(e));
    return () => ds.forEach((d) => d());
  }
  unregister(kind: OrchestratorExtensionKind, id: string) {
    if (this.items.delete(this.key(kind, id))) this.emit();
  }
  removePlugin(pluginId: string): number {
    let n = 0;
    for (const [k, v] of this.items) {
      if (v.pluginId === pluginId) {
        this.items.delete(k);
        n++;
      }
    }
    if (n > 0) this.emit();
    return n;
  }
  listAll(): OrchestratorExtension[] {
    return [...this.items.values()];
  }
  planners(): OrchestratorPlanner[] {
    return this.by("planner");
  }
  selectors(): OrchestratorSelector[] {
    return this.by("selector");
  }
  pipelines(): OrchestratorPipeline[] {
    return this.by("pipeline");
  }
  policies(): ExecutionPolicy[] {
    return this.by("policy");
  }
  private by<K extends OrchestratorExtensionKind>(
    k: K
  ): Array<Extract<OrchestratorExtension, { kind: K }>> {
    return this.listAll().filter((e) => e.kind === k) as Array<
      Extract<OrchestratorExtension, { kind: K }>
    >;
  }
  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  __reset(): void {
    this.items.clear();
    this.emit();
  }
  private emit() {
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        /* ignore */
      }
    }
  }
}

export const orchestratorRegistry = new OrchestratorRegistry();

export function planExecution(
  ctx: AiInvocationContext,
  opts?: OrchestrateOptions
): ExecutionPlan {
  const policy = resolvePolicy(opts?.policy, orchestratorRegistry.policies());
  const plan = runPlanners(
    { ctx, policy, input: opts?.input },
    orchestratorRegistry.planners(),
    orchestratorRegistry.selectors()
  );
  // Se pipeline customizado bater no contexto, sobrescreve steps
  const custom = orchestratorRegistry
    .pipelines()
    .slice()
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
    .find((p) => (p.match ? p.match(ctx) : false));
  if (custom) {
    plan.pipeline = custom.steps;
    plan.reason = `pipeline:${custom.id}`;
  }
  recordPlan(plan);
  return plan;
}

export async function orchestrate(
  ctx: AiInvocationContext,
  opts?: OrchestrateOptions & {
    signal?: AbortSignal;
    timeoutMs?: number;
    retries?: number;
  }
): Promise<OrchestrateResult> {
  const plan = planExecution(ctx, opts);
  if (opts?.dryRun) {
    return {
      plan,
      chain: {
        id: `dry_${plan.id}`,
        planId: plan.id,
        startedAt: Date.now(),
        endedAt: Date.now(),
        totalDurationMs: 0,
        status: "ok",
        steps: [],
      },
      ok: true,
    };
  }
  const chain = await scheduleExecution(plan, {
    ctx,
    input: opts?.input,
    signal: opts?.signal,
    timeoutMs: opts?.timeoutMs,
    retries: opts?.retries,
  });
  recordChain(chain);
  return {
    plan,
    chain,
    output: chain.finalOutput,
    ok: chain.status === "ok",
    error: chain.error,
  };
}
