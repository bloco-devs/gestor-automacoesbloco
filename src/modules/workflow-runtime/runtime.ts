/**
 * WorkflowRuntime — singleton que orquestra execução real de workflows.
 * Reutiliza WorkflowEngine + WorkflowRunner (006B) sem duplicação.
 */
import { workflowEngine, workflowRunner } from "@/modules/workflow-engine";
import type {
  EngineContext,
  ExecutionResult,
} from "@/modules/workflow-engine/types";
import type {
  TriggerKind,
  WorkflowDefinition,
} from "@/modules/workflow-builder/types";
import { realAdapters } from "./adapters";
import { insertExecutionLog, listActiveWorkflows } from "./service";

export type RuntimeEvent =
  | { kind: "DemandCreated"; demandId: string; payload: Record<string, unknown> }
  | { kind: "DemandUpdated"; demandId: string; payload: Record<string, unknown> }
  | { kind: "ManualExecution"; workflowId: string; ctx: EngineContext };

const EVENT_TO_TRIGGERS: Record<RuntimeEvent["kind"], TriggerKind[]> = {
  DemandCreated: ["demand.created"],
  DemandUpdated: [
    "demand.updated",
    "demand.priority_changed",
    "demand.assignee_changed",
    "demand.status_changed",
  ],
  ManualExecution: ["manual"],
};

function ctxFromPayload(payload: Record<string, unknown>): EngineContext {
  return {
    type: (payload.type as EngineContext["type"]) ?? "",
    priority: (payload.priority as EngineContext["priority"]) ?? "",
    status: (payload.status as EngineContext["status"]) ?? "",
    complexity: (payload.complexity as EngineContext["complexity"]) ?? "",
    system: (payload.system_id as string) ?? "",
    assignee: (payload.assigned_to as string) ?? "",
    payload,
  };
}

class WorkflowRuntimeImpl {
  private cache: WorkflowDefinition[] = [];
  private ready = false;
  private inflight: Promise<void> | null = null;

  async refresh(): Promise<void> {
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      try {
        this.cache = await listActiveWorkflows();
        this.ready = true;
      } catch (err) {
        console.warn("[workflow-runtime] refresh falhou:", err);
      } finally {
        this.inflight = null;
      }
    })();
    return this.inflight;
  }

  getCache(): WorkflowDefinition[] {
    return this.cache;
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Executa todos os workflows ativos que casam com o evento. */
  async run(event: RuntimeEvent): Promise<ExecutionResult[]> {
    if (!this.ready) await this.refresh();

    if (event.kind === "ManualExecution") {
      const wf = this.cache.find((w) => w.id === event.workflowId);
      if (!wf) return [];
      return [await this.execute(wf, event.ctx, event.ctx.payload?.id as string | undefined)];
    }

    const triggers = EVENT_TO_TRIGGERS[event.kind];
    const matching = this.cache.filter((w) => w.enabled && triggers.includes(w.trigger));
    const ctx = ctxFromPayload(event.payload);
    const results: ExecutionResult[] = [];
    for (const wf of matching) {
      try {
        results.push(await this.execute(wf, ctx, event.demandId));
      } catch (err) {
        console.warn(`[workflow-runtime] ${wf.name} falhou:`, err);
      }
    }
    return results;
  }

  private async execute(
    wf: WorkflowDefinition,
    ctx: EngineContext,
    demandId?: string | null,
  ): Promise<ExecutionResult> {
    const plan = workflowEngine.plan(wf, ctx, { mode: "live" });
    const result = await workflowRunner.run(plan, { ctx, adapters: realAdapters });
    const status = !plan.matched
      ? "skipped"
      : result.succeeded
      ? "success"
      : result.outcomes.some((o) => o.status === "error")
      ? "failed"
      : "partial";
    await insertExecutionLog({
      workflow_id: wf.id,
      demand_id: demandId ?? null,
      status,
      duration_ms: result.totalMs,
      execution_result: {
        matched: plan.matched,
        matchedNodes: plan.matchedNodes,
        unmatchedNodes: plan.unmatchedNodes,
        validationErrors: plan.validationErrors,
        outcomes: result.outcomes,
      },
    });
    return result;
  }
}

export const workflowRuntime = new WorkflowRuntimeImpl();
