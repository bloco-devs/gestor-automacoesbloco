import { describe, it, expect } from "vitest";
import { makeEmptyWorkflow } from "@/modules/workflow-builder";
import { uid } from "@/modules/workflow-builder/utils/id";
import { workflowEngine } from "../engine/WorkflowEngine";

describe("WorkflowEngine.plan", () => {
  it("gera plano com steps quando condições batem", () => {
    const wf = makeEmptyWorkflow();
    wf.actions.push({ id: uid("a"), type: "send_notification", params: { to: "ops" } });
    const plan = workflowEngine.plan(wf, {});
    expect(plan.matched).toBe(true);
    expect(plan.steps).toHaveLength(1);
    expect(plan.mode).toBe("dryRun");
    expect(plan.steps[0].reason).toContain("Notificar");
  });

  it("plano vazio quando não bate", () => {
    const wf = makeEmptyWorkflow();
    wf.conditions.children.push({
      id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "critica",
    });
    wf.actions.push({ id: uid("a"), type: "refresh_inbox", params: {} });
    const plan = workflowEngine.plan(wf, { priority: "baixa" });
    expect(plan.matched).toBe(false);
    expect(plan.steps).toHaveLength(0);
  });

  it("propaga erros de validação", () => {
    const wf = makeEmptyWorkflow();
    wf.name = "";
    const plan = workflowEngine.plan(wf, {});
    expect(plan.validationErrors.length).toBeGreaterThan(0);
  });
});
