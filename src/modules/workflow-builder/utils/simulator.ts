/**
 * Simulador visual — avalia condições contra uma amostra fornecida pelo usuário.
 * Não dispara nenhuma ação. Puro.
 */
import type {
  Condition,
  ConditionGroup,
  ConditionNode,
  SimulationResult,
  SimulationSample,
  WorkflowDefinition,
} from "../types";

function sampleValue(sample: SimulationSample, field: Condition["field"]): string | undefined {
  const key = field as keyof SimulationSample;
  const v = sample[key];
  return v == null || v === "" ? undefined : String(v);
}

function evalCondition(sample: SimulationSample, c: Condition): boolean {
  const actual = sampleValue(sample, c.field);
  const expected = c.value;
  switch (c.operator) {
    case "is_set":
      return actual !== undefined;
    case "is_unset":
      return actual === undefined;
    case "eq":
      return actual === String(expected ?? "");
    case "neq":
      return actual !== String(expected ?? "");
    case "in":
      return Array.isArray(expected) && actual !== undefined && expected.includes(actual);
    case "not_in":
      return Array.isArray(expected) && (actual === undefined || !expected.includes(actual));
    case "contains":
      return (
        actual !== undefined &&
        typeof expected === "string" &&
        actual.toLowerCase().includes(expected.toLowerCase())
      );
    default:
      return false;
  }
}

interface NodeEval {
  matched: boolean;
  matchedIds: string[];
  unmatchedIds: string[];
}

function evalNode(sample: SimulationSample, node: ConditionNode): NodeEval {
  if (node.kind === "condition") {
    const ok = evalCondition(sample, node);
    return {
      matched: ok,
      matchedIds: ok ? [node.id] : [],
      unmatchedIds: ok ? [] : [node.id],
    };
  }
  const results = node.children.map((c) => evalNode(sample, c));
  const matchedIds = results.flatMap((r) => r.matchedIds);
  const unmatchedIds = results.flatMap((r) => r.unmatchedIds);
  let matched: boolean;
  if (node.op === "NOT") {
    matched = results.every((r) => !r.matched);
  } else if (node.op === "AND") {
    matched = results.length > 0 && results.every((r) => r.matched);
  } else {
    matched = results.some((r) => r.matched);
  }
  return { matched, matchedIds, unmatchedIds };
}

export function simulateWorkflow(
  wf: WorkflowDefinition,
  sample: SimulationSample,
): SimulationResult {
  const hasChildren = wf.conditions.children.length > 0;
  const evaluated = hasChildren
    ? evalNode(sample, wf.conditions)
    : { matched: true, matchedIds: [], unmatchedIds: [] };
  return {
    matched: evaluated.matched,
    matchedNodes: evaluated.matchedIds,
    unmatchedNodes: evaluated.unmatchedIds,
    plannedActions: evaluated.matched ? wf.actions : [],
  };
}
