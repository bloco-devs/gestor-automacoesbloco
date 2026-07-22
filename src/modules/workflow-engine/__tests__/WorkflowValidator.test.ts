import { describe, it, expect } from "vitest";
import { makeEmptyWorkflow } from "@/modules/workflow-builder";
import { uid } from "@/modules/workflow-builder/utils/id";
import {
  validateForEngine,
  isValidForEngine,
} from "../validators/WorkflowValidator";

describe("WorkflowValidator", () => {
  it("workflow completo é válido", () => {
    const wf = makeEmptyWorkflow();
    wf.actions.push({ id: uid("a"), type: "refresh_inbox", params: {} });
    expect(isValidForEngine(wf)).toBe(true);
  });

  it("acusa nome vazio e ausência de ações", () => {
    const wf = makeEmptyWorkflow();
    wf.name = "";
    const errs = validateForEngine(wf);
    expect(errs.some((e) => e.path === "name")).toBe(true);
    expect(errs.some((e) => e.path === "actions")).toBe(true);
  });

  it("acusa executor ausente", () => {
    const wf = makeEmptyWorkflow();
    wf.actions.push({
      id: uid("a"),
      // @ts-expect-error — força ação inexistente
      type: "acao_desconhecida",
      params: {},
    });
    const errs = validateForEngine(wf);
    expect(errs.some((e) => e.message.includes("executor"))).toBe(true);
  });
});
