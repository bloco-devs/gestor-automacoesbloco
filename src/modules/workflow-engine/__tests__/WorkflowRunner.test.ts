import { describe, it, expect } from "vitest";
import { makeEmptyWorkflow } from "@/modules/workflow-builder";
import { uid } from "@/modules/workflow-builder/utils/id";
import { workflowEngine } from "../engine/WorkflowEngine";
import { workflowRunner } from "../engine/WorkflowRunner";
import { createMockAdapters } from "../adapters/mocks";

function wfWith2Actions() {
  const wf = makeEmptyWorkflow();
  wf.actions.push(
    { id: uid("a"), type: "set_priority", params: { priority: "alta" } },
    { id: uid("a"), type: "send_notification", params: { to: "ops" } },
  );
  return wf;
}

describe("WorkflowRunner", () => {
  it("dryRun: nenhum adapter é chamado, outcomes ficam 'mocked'", async () => {
    const wf = wfWith2Actions();
    const plan = workflowEngine.plan(wf, {}, { mode: "dryRun" });
    const adapters = createMockAdapters();
    const res = await workflowRunner.run(plan, { ctx: {}, adapters });
    expect(res.succeeded).toBe(true);
    expect(adapters.__calls).toHaveLength(0);
    expect(res.outcomes.every((o) => o.status === "mocked")).toBe(true);
  });

  it("live com mocks: adapters recebem chamadas", async () => {
    const wf = wfWith2Actions();
    const plan = workflowEngine.plan(wf, {}, { mode: "live" });
    const adapters = createMockAdapters();
    const res = await workflowRunner.run(plan, { ctx: {}, adapters });
    expect(res.succeeded).toBe(true);
    expect(adapters.__calls.length).toBe(2);
    expect(adapters.__calls[0]).toMatchObject({ adapter: "demand", method: "setPriority" });
    expect(adapters.__calls[1]).toMatchObject({ adapter: "notification", method: "send" });
  });

  it("skipa steps quando não bate", async () => {
    const wf = wfWith2Actions();
    wf.conditions.children.push({
      id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "critica",
    });
    const plan = workflowEngine.plan(wf, { priority: "baixa" }, { mode: "live" });
    const res = await workflowRunner.run(plan, { ctx: { priority: "baixa" } });
    expect(res.plan.matched).toBe(false);
    expect(res.outcomes).toHaveLength(0);
  });
});
