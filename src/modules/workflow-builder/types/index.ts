/**
 * Workflow Builder — tipos públicos.
 * NÃO executa nada. Apenas modelo + validação + simulação visual.
 * Preparado para a futura Workflow Engine.
 */
import type {
  DemandComplexity,
  DemandPriority,
  DemandStatus,
  DemandType,
} from "@/modules/demands/types";

export type TriggerKind =
  | "demand.created"
  | "demand.updated"
  | "demand.priority_changed"
  | "demand.assignee_changed"
  | "demand.status_changed"
  | "manual";

export type ConditionField =
  | "type"
  | "system"
  | "priority"
  | "status"
  | "complexity"
  | "assignee"
  | "sla_status"
  | "origin"
  | "keyword"
  | "category";

export type ConditionOperator =
  | "eq"
  | "neq"
  | "in"
  | "not_in"
  | "contains"
  | "is_set"
  | "is_unset";

export interface Condition {
  id: string;
  kind: "condition";
  field: ConditionField;
  operator: ConditionOperator;
  value?: string | string[] | null;
}

export type GroupOp = "AND" | "OR" | "NOT";

export interface ConditionGroup {
  id: string;
  kind: "group";
  op: GroupOp;
  children: Array<Condition | ConditionGroup>;
}

export type ConditionNode = Condition | ConditionGroup;

export type ActionType =
  | "set_priority"
  | "set_assignee"
  | "run_smart_routing"
  | "add_comment"
  | "create_task"
  | "relate_knowledge_article"
  | "send_notification"
  | "refresh_inbox"
  | "log_audit";

export interface WorkflowAction {
  id: string;
  type: ActionType;
  params: Record<string, string | number | boolean | null | undefined>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  priority: number;
  notes: string;
  trigger: TriggerKind;
  conditions: ConditionGroup;
  actions: WorkflowAction[];
  version: number;
  author: string;
  created_at: string;
  updated_at: string;
}

/** Amostra visual usada na simulação — espelha campos de Demand mais comuns. */
export interface SimulationSample {
  type?: DemandType | "";
  priority?: DemandPriority | "";
  status?: DemandStatus | "";
  complexity?: DemandComplexity | "";
  system?: string;
  assignee?: string;
  sla_status?: "no_prazo" | "atencao" | "estourado" | "";
  origin?: string;
  category?: string;
  keyword?: string;
}

export interface SimulationResult {
  matched: boolean;
  matchedNodes: string[];
  unmatchedNodes: string[];
  plannedActions: WorkflowAction[];
}
