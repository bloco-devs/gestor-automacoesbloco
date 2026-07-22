import { describe, it, expect } from "vitest";
import { validateWorkflow } from "../validators/workflow";
import { makeEmptyWorkflow } from "../hooks/useWorkflows";
import { uid } from "../utils/id";

describe("validateWorkflow", () => {
  it("exige nome e ação", () => {
    const wf = makeEmptyWorkflow();
    const errs = validateWorkflow(wf);
    expect(errs.some((e) => e.path === "name")).toBe(true);
    expect(errs.some((e) => e.path === "actions")).toBe(true);
  });

  it("aceita workflow mínimo válido", () => {
    const wf = makeEmptyWorkflow();
    wf.name = "Teste";
    wf.actions.push({ id: uid("a"), type: "run_smart_routing", params: {} });
    expect(validateWorkflow(wf)).toEqual([]);
  });

  it("cobra valor quando operador precisa", () => {
    const wf = makeEmptyWorkflow();
    wf.name = "X";
    wf.actions.push({ id: uid("a"), type: "run_smart_routing", params: {} });
    wf.conditions.children.push({
      id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "",
    });
    const errs = validateWorkflow(wf);
    expect(errs.some((e) => e.message.includes("valor"))).toBe(true);
  });
});
