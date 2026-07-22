import { describe, it, expect } from "vitest";
import { makeEmptyWorkflow } from "@/modules/workflow-builder";
import { uid } from "@/modules/workflow-builder/utils/id";
import { evaluateConditions } from "../engine/ConditionEvaluator";

describe("ConditionEvaluator", () => {
  it("AND: casa quando todas batem", () => {
    const wf = makeEmptyWorkflow();
    wf.conditions.children.push(
      { id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "critica" },
      { id: uid("c"), kind: "condition", field: "type", operator: "eq", value: "bug" },
    );
    const r = evaluateConditions(wf, { priority: "critica", type: "bug" });
    expect(r.matched).toBe(true);
    expect(r.matchedNodes.length).toBe(2);
  });

  it("OR: basta uma", () => {
    const wf = makeEmptyWorkflow();
    wf.conditions.op = "OR";
    wf.conditions.children.push(
      { id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "critica" },
      { id: uid("c"), kind: "condition", field: "type", operator: "eq", value: "bug" },
    );
    const r = evaluateConditions(wf, { priority: "critica" });
    expect(r.matched).toBe(true);
  });

  it("NOT + grupo aninhado", () => {
    const wf = makeEmptyWorkflow();
    wf.conditions.children.push({
      id: uid("g"),
      kind: "group",
      op: "NOT",
      children: [
        { id: uid("c"), kind: "condition", field: "priority", operator: "eq", value: "baixa" },
      ],
    });
    const r = evaluateConditions(wf, { priority: "alta" });
    expect(r.matched).toBe(true);
  });

  it("sem condições → sempre casa", () => {
    const wf = makeEmptyWorkflow();
    const r = evaluateConditions(wf, {});
    expect(r.matched).toBe(true);
  });
});
