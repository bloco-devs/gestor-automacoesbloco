import { describe, it, expect } from "vitest";
import { makeEmptyWorkflow } from "@/modules/workflow-builder";
import { uid } from "@/modules/workflow-builder/utils/id";
import { simulate } from "../utils/simulate";

describe("simulate (reuso do Engine)", () => {
  it("retorna shape compatível e plano dryRun", () => {
    const wf = makeEmptyWorkflow();
    wf.conditions.children.push({
      id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "critica",
    });
    wf.actions.push({ id: uid("a"), type: "send_notification", params: { to: "ops" } });
    const r = simulate(wf, { priority: "critica" });
    expect(r.matched).toBe(true);
    expect(r.plannedActions).toHaveLength(1);
    expect(r.plan.mode).toBe("dryRun");
  });

  it("não bate → plannedActions vazio", () => {
    const wf = makeEmptyWorkflow();
    wf.conditions.children.push({
      id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "critica",
    });
    wf.actions.push({ id: uid("a"), type: "refresh_inbox", params: {} });
    const r = simulate(wf, { priority: "baixa" });
    expect(r.matched).toBe(false);
    expect(r.plannedActions).toHaveLength(0);
  });
});
