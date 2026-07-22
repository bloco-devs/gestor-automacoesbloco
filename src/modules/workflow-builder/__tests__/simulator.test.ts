import { describe, it, expect } from "vitest";
import { simulateWorkflow } from "../utils/simulator";
import { makeEmptyWorkflow } from "../hooks/useWorkflows";
import { uid } from "../utils/id";
import type { WorkflowDefinition } from "../types";

function buildWorkflow(): WorkflowDefinition {
  const wf = makeEmptyWorkflow();
  wf.name = "Escalar críticos";
  wf.conditions.children.push(
    { id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "critica" },
    { id: uid("c"), kind: "condition", field: "type", operator: "eq", value: "bug" },
  );
  wf.actions.push({ id: uid("a"), type: "send_notification", params: { to: "on-call" } });
  return wf;
}

describe("simulateWorkflow", () => {
  it("bate quando amostra corresponde (AND)", () => {
    const wf = buildWorkflow();
    const r = simulateWorkflow(wf, { priority: "critica", type: "bug" });
    expect(r.matched).toBe(true);
    expect(r.plannedActions).toHaveLength(1);
  });

  it("não bate quando um critério falha", () => {
    const wf = buildWorkflow();
    const r = simulateWorkflow(wf, { priority: "alta", type: "bug" });
    expect(r.matched).toBe(false);
    expect(r.plannedActions).toHaveLength(0);
    expect(r.unmatchedNodes.length).toBeGreaterThan(0);
  });

  it("OR: basta um casar", () => {
    const wf = buildWorkflow();
    wf.conditions.op = "OR";
    const r = simulateWorkflow(wf, { priority: "critica", type: "melhoria" });
    expect(r.matched).toBe(true);
  });

  it("workflow sem condições sempre casa", () => {
    const wf = makeEmptyWorkflow();
    wf.name = "Sempre";
    wf.actions.push({ id: uid("a"), type: "refresh_inbox", params: {} });
    const r = simulateWorkflow(wf, {});
    expect(r.matched).toBe(true);
    expect(r.plannedActions).toHaveLength(1);
  });
});
