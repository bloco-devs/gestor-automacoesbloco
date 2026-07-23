/**
 * AI Orchestrator SDK — types.
 * Aditivo. Não altera o AI SDK nem o Core.
 */
import type {
  AiAgent,
  AiInvocationContext,
  AiPrompt,
  AiSkill,
  AiTool,
  AiMemoryProvider,
  AiExecutionResult,
} from "../../ai-sdk/types";

export type PolicyId = "fast" | "balanced" | "quality" | "developer" | "economy" | string;

export interface ExecutionPolicy {
  kind: "policy";
  id: PolicyId;
  pluginId: string;
  description?: string;
  /** Máximo de agentes/skills/tools considerados. */
  maxAgents?: number;
  maxSkills?: number;
  maxTools?: number;
  /** Multiplicador de custo estimado. */
  costMultiplier?: number;
  /** Confiança mínima aceita para o plano. */
  minConfidence?: number;
  /** Modo de execução do scheduler. */
  scheduling?: "sequential" | "parallel" | "pipeline";
  /** Preferências para o selector. */
  preferHealth?: boolean;
  preferHighestPriority?: boolean;
}

export interface PlannerContext {
  ctx: AiInvocationContext;
  policy: ExecutionPolicy;
  input?: string;
}

export interface ExecutionPlan {
  id: string;
  createdAt: number;
  policy: PolicyId;
  agent?: AiAgent;
  skills: AiSkill[];
  tools: AiTool[];
  memory?: AiMemoryProvider;
  prompt?: AiPrompt;
  pipeline: PipelineStepSpec[];
  priority: number;
  estimatedCost: number;
  confidence: number;
  reason?: string;
  warnings?: string[];
}

export type PipelineStepKind =
  | "context"
  | "planner"
  | "agent"
  | "skill"
  | "tool"
  | "prompt"
  | "memory"
  | "output"
  | "custom";

export interface PipelineStepSpec {
  id: string;
  kind: PipelineStepKind;
  refId?: string; // id da skill/tool/agent quando aplicável
  description?: string;
  optional?: boolean;
  parallelGroup?: string;
}

export type StepStatus = "pending" | "running" | "ok" | "error" | "skipped" | "cancelled";

export interface ExecutionStep {
  spec: PipelineStepSpec;
  status: StepStatus;
  startedAt?: number;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  health?: "ok" | "degraded" | "down";
  warnings?: string[];
}

export interface ExecutionChain {
  id: string;
  planId: string;
  startedAt: number;
  endedAt?: number;
  totalDurationMs?: number;
  status: "running" | "ok" | "error" | "cancelled";
  steps: ExecutionStep[];
  finalOutput?: unknown;
  error?: string;
}

export interface OrchestratorPlanner {
  kind: "planner";
  id: string;
  pluginId: string;
  description?: string;
  priority?: number;
  plan(input: PlannerContext): ExecutionPlan | null | undefined;
}

export interface OrchestratorSelector {
  kind: "selector";
  id: string;
  pluginId: string;
  description?: string;
  priority?: number;
  selectAgent?(ctx: AiInvocationContext, policy: ExecutionPolicy, agents: AiAgent[]): AiAgent | undefined;
  selectSkills?(ctx: AiInvocationContext, policy: ExecutionPolicy, skills: AiSkill[]): AiSkill[];
  selectTools?(ctx: AiInvocationContext, policy: ExecutionPolicy, tools: AiTool[]): AiTool[];
}

export interface OrchestratorPipeline {
  kind: "pipeline";
  id: string;
  pluginId: string;
  description?: string;
  steps: PipelineStepSpec[];
  match?(ctx: AiInvocationContext): boolean;
  priority?: number;
}

export type OrchestratorExtension =
  | OrchestratorPlanner
  | OrchestratorSelector
  | OrchestratorPipeline
  | ExecutionPolicy;

export type OrchestratorExtensionKind = OrchestratorExtension["kind"];

export interface OrchestrateOptions {
  policy?: PolicyId;
  input?: string;
  /** Retorna o plano mas não executa. */
  dryRun?: boolean;
}

export interface OrchestrateResult {
  plan: ExecutionPlan;
  chain: ExecutionChain;
  output?: unknown;
  ok: boolean;
  error?: string;
}

export type { AiExecutionResult };
