import { describe, it, expect } from "vitest";
import { summarizeWorkflow } from "../utils/summary";
import { makeEmptyWorkflow } from "../hooks/useWorkflows";
import { uid } from "../utils/id";

describe("summarizeWorkflow", () => {
  it("descreve workflow vazio", () => {
    const wf = makeEmptyWorkflow("Ana");
    const s = summarizeWorkflow(wf);
    expect(s).toMatch(/Quando/);
    expect(s).toMatch(/sem condições/);
    expect(s).toMatch(/nenhuma ação/);
  });

  it("descreve condição e ação", () => {
    const wf = makeEmptyWorkflow();
    wf.conditions.children.push({
      id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "alta",
    });
    wf.actions.push({ id: uid("a"), type: "run_smart_routing", params: {} });
    const s = summarizeWorkflow(wf);
    expect(s).toMatch(/Prioridade/);
    expect(s).toMatch(/Alta/);
    expect(s).toMatch(/Smart Routing/);
  });
});
