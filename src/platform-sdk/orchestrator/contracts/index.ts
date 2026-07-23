/**
 * Orchestrator — mesh contract.
 */
import type { AiInvocationContext } from "../../ai-sdk/types";
import type {
  ExecutionPlan,
  OrchestrateOptions,
  OrchestrateResult,
  OrchestratorExtension,
} from "../types";
import { orchestrate, orchestratorRegistry, planExecution } from "../executor";
import { collectOrchestratorDiagnostics, type OrchestratorDiagnostics } from "../diagnostics";
import { listChains, listPlans } from "../chains";

export const AI_ORCHESTRATOR_CONTRACT = "service.ai-orchestrator" as const;
export const AI_ORCHESTRATOR_VERSION = "1.0.0";

export interface AiOrchestratorService {
  readonly kind: "ai-orchestrator";
  register(ext: OrchestratorExtension): () => void;
  registerAll(exts: OrchestratorExtension[]): () => void;
  removePlugin(pluginId: string): number;

  plan(ctx: AiInvocationContext, opts?: OrchestrateOptions): ExecutionPlan;
  orchestrate(
    ctx: AiInvocationContext,
    opts?: OrchestrateOptions & {
      signal?: AbortSignal;
      timeoutMs?: number;
      retries?: number;
    }
  ): Promise<OrchestrateResult>;

  listPlans: typeof listPlans;
  listChains: typeof listChains;
  diagnostics(): OrchestratorDiagnostics;
}

export const aiOrchestratorService: AiOrchestratorService = {
  kind: "ai-orchestrator",
  register: (e) => orchestratorRegistry.register(e),
  registerAll: (e) => orchestratorRegistry.registerAll(e),
  removePlugin: (id) => orchestratorRegistry.removePlugin(id),
  plan: (ctx, opts) => planExecution(ctx, opts),
  orchestrate: (ctx, opts) => orchestrate(ctx, opts),
  listPlans,
  listChains,
  diagnostics: () => collectOrchestratorDiagnostics(),
};
