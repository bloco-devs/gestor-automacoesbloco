/**
 * Gera um resumo em linguagem natural do workflow — "Human First".
 * Puro, sem I/O.
 */
import type {
  Condition,
  ConditionGroup,
  ConditionNode,
  WorkflowAction,
  WorkflowDefinition,
} from "../types";
import {
  ACTION_LABELS,
  FIELD_LABELS,
  OPERATOR_LABELS,
  TRIGGER_LABELS,
  valueOptionsFor,
} from "./catalog";

function readableValue(c: Condition): string {
  if (c.operator === "is_set" || c.operator === "is_unset") return "";
  const opts = valueOptionsFor(c.field);
  const raw = c.value;
  if (Array.isArray(raw)) {
    const labels = raw.map((v) => opts?.find((o) => o.value === v)?.label ?? v);
    return labels.join(" ou ");
  }
  if (raw == null || raw === "") return "—";
  return opts?.find((o) => o.value === raw)?.label ?? String(raw);
}

function summarizeCondition(c: Condition): string {
  const field = FIELD_LABELS[c.field];
  const op = OPERATOR_LABELS[c.operator];
  const val = readableValue(c);
  return val ? `${field} ${op} ${val}` : `${field} ${op}`;
}

function summarizeNode(node: ConditionNode): string {
  if (node.kind === "condition") return summarizeCondition(node);
  const parts = node.children.map(summarizeNode);
  if (parts.length === 0) return "";
  if (node.op === "NOT") return `não (${parts.join(" e ")})`;
  const joiner = node.op === "AND" ? " e " : " ou ";
  return parts.length === 1 ? parts[0] : `(${parts.join(joiner)})`;
}

function summarizeAction(a: WorkflowAction): string {
  const label = ACTION_LABELS[a.type];
  const paramSummary = Object.entries(a.params ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");
  return paramSummary ? `${label} (${paramSummary})` : label;
}

export function summarizeConditions(root: ConditionGroup): string {
  const inner = summarizeNode(root);
  return inner || "sem condições (executa sempre)";
}

export function summarizeActions(actions: WorkflowAction[]): string {
  if (!actions.length) return "nenhuma ação configurada";
  return actions.map(summarizeAction).join("; ");
}

export function summarizeWorkflow(wf: WorkflowDefinition): string {
  const when = TRIGGER_LABELS[wf.trigger].toLowerCase();
  const cond = summarizeConditions(wf.conditions);
  const acts = summarizeActions(wf.actions);
  return `Quando ${when}, se ${cond}, então ${acts}.`;
}
