/**
 * Workflow Engine — tipos públicos.
 * Puro. Sem React, sem Supabase, sem efeitos colaterais.
 * Reutiliza o modelo do Workflow Builder (Feature 006A).
 */
import type {
  SimulationSample,
  WorkflowAction,
  WorkflowDefinition,
} from "@/modules/workflow-builder/types";

export type ExecutionMode = "dryRun" | "live";

/** Contexto passado à engine. Extende a amostra visual e permite carga extra. */
export interface EngineContext extends SimulationSample {
  /** Fonte livre para adapters (ex.: demand real). */
  payload?: Record<string, unknown>;
  /** Identificação de quem/que sistema disparou. */
  actor?: string;
  /** Timestamp lógico (ISO) — default: agora. */
  now?: string;
}

/** Passo individual dentro de um plano — 1:1 com uma ação declarada. */
export interface ExecutionStep {
  id: string;
  action: WorkflowAction;
  /** Motivo humano — usado no diagnóstico. */
  reason: string;
}

/** Plano determinístico produzido pela engine. Não executa nada. */
export interface ExecutionPlan {
  workflowId: string;
  workflowVersion: number;
  mode: ExecutionMode;
  matched: boolean;
  matchedNodes: string[];
  unmatchedNodes: string[];
  steps: ExecutionStep[];
  /** Erros de validação estrutural (bloqueiam execução live). */
  validationErrors: string[];
  createdAt: string;
}

export type StepStatus = "ok" | "skipped" | "error" | "mocked";

export interface StepOutcome {
  stepId: string;
  actionType: WorkflowAction["type"];
  status: StepStatus;
  message: string;
  durationMs: number;
  output?: unknown;
}

export interface ExecutionResult {
  plan: ExecutionPlan;
  outcomes: StepOutcome[];
  succeeded: boolean;
  startedAt: string;
  finishedAt: string;
  totalMs: number;
}

/** Simulação = plano em dryRun + o resultado do Builder original. */
export interface EngineSimulationResult {
  matched: boolean;
  matchedNodes: string[];
  unmatchedNodes: string[];
  plannedActions: WorkflowAction[];
  plan: ExecutionPlan;
}

/** Reexports para consumidores externos. */
export type { WorkflowAction, WorkflowDefinition, SimulationSample };
