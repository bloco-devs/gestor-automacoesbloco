/**
 * Workflow SDK — Types (PLUGIN 005).
 * Contratos que plugins usam para estender o Workflow Engine.
 * NENHUM tipo aqui referencia o Workflow Engine — o SDK é standalone.
 */

export type WorkflowExtensionKind =
  | "trigger"
  | "condition"
  | "action"
  | "validator"
  | "transformer"
  | "hook";

export type WorkflowExtensionCategory =
  | "core"
  | "demand"
  | "knowledge"
  | "routing"
  | "notification"
  | "integration"
  | "ai"
  | "misc";

/** Base comum a todas as extensões. */
export interface WorkflowExtensionBase {
  id: string;
  name: string;
  description?: string;
  category?: WorkflowExtensionCategory;
  pluginId: string;
  version?: string;
}

/** Parâmetro de entrada/saída declarado por triggers/actions. */
export interface WorkflowExtensionField {
  name: string;
  type: "string" | "number" | "boolean" | "json" | "date";
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
}

export type ExtensionHealth = "ok" | "degraded" | "down" | "unknown";

/* -------------------------------------------------------------------------- */
/* Triggers                                                                   */
/* -------------------------------------------------------------------------- */
export interface WorkflowTriggerContext {
  now: number;
  emit?: (event: string, payload?: unknown) => void;
  logger?: (msg: string, meta?: unknown) => void;
}

export interface WorkflowTrigger extends WorkflowExtensionBase {
  kind: "trigger";
  inputs?: WorkflowExtensionField[];
  outputs?: WorkflowExtensionField[];
  execute: (
    ctx: WorkflowTriggerContext,
    payload?: Record<string, unknown>
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  health?: () => Promise<ExtensionHealth> | ExtensionHealth;
}

/* -------------------------------------------------------------------------- */
/* Conditions                                                                 */
/* -------------------------------------------------------------------------- */
export interface WorkflowConditionContext {
  now: number;
  logger?: (msg: string, meta?: unknown) => void;
}

export interface WorkflowCondition extends WorkflowExtensionBase {
  kind: "condition";
  inputs?: WorkflowExtensionField[];
  evaluate: (
    ctx: WorkflowConditionContext,
    payload: Record<string, unknown>
  ) => Promise<boolean> | boolean;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */
export interface WorkflowActionContext {
  now: number;
  logger?: (msg: string, meta?: unknown) => void;
  emit?: (event: string, payload?: unknown) => void;
}

export interface WorkflowActionResult {
  ok: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

export interface WorkflowAction extends WorkflowExtensionBase {
  kind: "action";
  inputs?: WorkflowExtensionField[];
  outputs?: WorkflowExtensionField[];
  execute: (
    ctx: WorkflowActionContext,
    payload: Record<string, unknown>
  ) => Promise<WorkflowActionResult> | WorkflowActionResult;
  health?: () => Promise<ExtensionHealth> | ExtensionHealth;
}

/* -------------------------------------------------------------------------- */
/* Validators                                                                 */
/* -------------------------------------------------------------------------- */
export type ValidatorSeverity = "info" | "warning" | "error";

export interface ValidatorIssue {
  severity: ValidatorSeverity;
  message: string;
  path?: string;
  code?: string;
}

export interface WorkflowValidator extends WorkflowExtensionBase {
  kind: "validator";
  /** Recebe uma definição de workflow arbitrária. Deve ser pura. */
  validate: (definition: unknown) => ValidatorIssue[] | Promise<ValidatorIssue[]>;
}

/* -------------------------------------------------------------------------- */
/* Transformers                                                               */
/* -------------------------------------------------------------------------- */
export interface WorkflowTransformer extends WorkflowExtensionBase {
  kind: "transformer";
  transform: (
    payload: Record<string, unknown>
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

/* -------------------------------------------------------------------------- */
/* Execution Hooks                                                            */
/* -------------------------------------------------------------------------- */
export interface HookContext {
  runId: string;
  phase:
    | "beforeExecute"
    | "afterExecute"
    | "onError"
    | "onCancel"
    | "beforeAction"
    | "afterAction";
  actionId?: string;
  payload?: unknown;
  error?: string;
  logger?: (msg: string, meta?: unknown) => void;
}

export interface WorkflowHook extends WorkflowExtensionBase {
  kind: "hook";
  beforeExecute?: (ctx: HookContext) => void | Promise<void>;
  afterExecute?: (ctx: HookContext) => void | Promise<void>;
  onError?: (ctx: HookContext) => void | Promise<void>;
  onCancel?: (ctx: HookContext) => void | Promise<void>;
  beforeAction?: (ctx: HookContext) => void | Promise<void>;
  afterAction?: (ctx: HookContext) => void | Promise<void>;
}

export type WorkflowExtension =
  | WorkflowTrigger
  | WorkflowCondition
  | WorkflowAction
  | WorkflowValidator
  | WorkflowTransformer
  | WorkflowHook;
