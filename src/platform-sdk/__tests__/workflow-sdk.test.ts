import { describe, it, expect, beforeEach } from "vitest";
import {
  workflowExtensionRegistry,
  workflowSdkService,
  runAction,
  runTrigger,
  runValidators,
  collectWorkflowSdkDiagnostics,
  bootstrapWorkflowSdkProvider,
  __resetWorkflowSdkBootstrap,
  WORKFLOW_SDK_CONTRACT,
  type WorkflowExtension,
} from "../workflow-sdk";
import { serviceRegistry } from "../services/registry/registry";
import WorkflowExtensionsPlugin, {
  workflowExtensionsSampleList,
} from "@/plugins/workflow-extensions";

import type { WorkflowAction } from "../workflow-sdk";

function makeAction(id: string, ok = true): WorkflowAction {
  return {
    kind: "action",
    id,
    pluginId: "test.plugin",
    name: `Action ${id}`,
    execute: () => ({ ok, output: { id } }),
  };
}

describe("Workflow SDK · Registry", () => {
  beforeEach(() => {
    workflowExtensionRegistry.__reset();
  });

  it("registra e recupera por tipo", () => {
    workflowSdkService.register(makeAction("a1"));
    workflowSdkService.register(makeAction("a2"));
    expect(workflowSdkService.actions()).toHaveLength(2);
    expect(workflowExtensionRegistry.get("action", "a1")?.name).toBe("Action a1");
  });

  it("dedup por (kind:id)", () => {
    workflowSdkService.register(makeAction("dup"));
    workflowSdkService.register(makeAction("dup"));
    expect(workflowSdkService.actions()).toHaveLength(1);
  });

  it("registerAll retorna disposer", () => {
    const dispose = workflowSdkService.registerAll([
      makeAction("x1"),
      makeAction("x2"),
    ]);
    expect(workflowSdkService.actions()).toHaveLength(2);
    dispose();
    expect(workflowSdkService.actions()).toHaveLength(0);
  });

  it("removePlugin limpa todas as extensões de um plugin", () => {
    workflowSdkService.register(makeAction("z1"));
    workflowSdkService.register(makeAction("z2"));
    expect(workflowSdkService.removePlugin("test.plugin")).toBe(2);
    expect(workflowSdkService.actions()).toHaveLength(0);
  });

  it("diagnostics agrega por kind e plugin", () => {
    workflowSdkService.registerAll(workflowExtensionsSampleList);
    const d = collectWorkflowSdkDiagnostics();
    expect(d.total).toBe(workflowExtensionsSampleList.length);
    expect(d.byKind.trigger).toBe(2);
    expect(d.byKind.action).toBe(2);
    expect(d.byKind.condition).toBe(2);
    expect(d.byKind.validator).toBe(1);
    expect(d.byKind.hook).toBe(1);
    expect(d.byPlugin["plugin.workflow-extensions"]).toBe(
      workflowExtensionsSampleList.length
    );
  });
});

describe("Workflow SDK · Execution", () => {
  beforeEach(() => workflowExtensionRegistry.__reset());

  it("runAction retorna resultado da action", async () => {
    const action = makeAction("run-ok");
    const res = await runAction(action, { payload: { foo: 1 } });
    expect(res.ok).toBe(true);
    expect(res.output).toEqual({ id: "run-ok" });
  });

  it("runAction captura erro sem lançar e chama onError", async () => {
    let errored = false;
    workflowSdkService.register({
      kind: "hook",
      id: "hook.err",
      pluginId: "test",
      name: "err",
      onError: () => {
        errored = true;
      },
    });
    const action: WorkflowExtension = {
      kind: "action",
      id: "boom",
      pluginId: "test",
      name: "boom",
      execute: () => {
        throw new Error("kaboom");
      },
    };
    const res = await runAction(action);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("kaboom");
    expect(errored).toBe(true);
  });

  it("runTrigger executa e dispara hooks before/after", async () => {
    const calls: string[] = [];
    workflowSdkService.register({
      kind: "hook",
      id: "hook.trace",
      pluginId: "test",
      name: "trace",
      beforeExecute: () => {
        calls.push("before");
      },
      afterExecute: () => {
        calls.push("after");
      },
    });
    const trigger: WorkflowExtension = {
      kind: "trigger",
      id: "t1",
      pluginId: "test",
      name: "t1",
      execute: () => ({ ok: true }),
    };
    const res = await runTrigger(trigger);
    expect(res.ok).toBe(true);
    expect(calls).toEqual(["before", "after"]);
  });
});

describe("Workflow SDK · Validation", () => {
  beforeEach(() => workflowExtensionRegistry.__reset());

  it("agrega issues de todos os validators", async () => {
    workflowSdkService.registerAll(workflowExtensionsSampleList);
    const report = await runValidators({ name: "" });
    expect(report.totalValidators).toBeGreaterThanOrEqual(1);
    expect(report.warnings + report.errors).toBeGreaterThanOrEqual(1);
    expect(report.issues[0].code).toBe("workflow.no-name");
  });

  it("captura erros de validators sem lançar", async () => {
    workflowSdkService.register({
      kind: "validator",
      id: "v.broken",
      pluginId: "test",
      name: "broken",
      validate: () => {
        throw new Error("boom-validator");
      },
    });
    const report = await runValidators({});
    expect(report.errors).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((i) => i.code === "validator.threw")).toBe(true);
  });
});

describe("Workflow SDK · Service Mesh bootstrap", () => {
  beforeEach(() => {
    __resetWorkflowSdkBootstrap();
    workflowExtensionRegistry.__reset();
  });

  it("publica provider no Service Mesh", () => {
    bootstrapWorkflowSdkProvider();
    const found = serviceRegistry
      .list()
      .find((r) => r.contract === (WORKFLOW_SDK_CONTRACT as unknown as string));
    expect(found).toBeTruthy();
    expect(found?.pluginId).toBe("platform.core");
  });

  it("bootstrap é idempotente", () => {
    bootstrapWorkflowSdkProvider();
    bootstrapWorkflowSdkProvider();
    const matches = serviceRegistry
      .list()
      .filter((r) => r.contract === (WORKFLOW_SDK_CONTRACT as unknown as string));
    expect(matches).toHaveLength(1);
  });
});

describe("Workflow SDK · Plugin exemplo", () => {
  beforeEach(() => workflowExtensionRegistry.__reset());

  it("ativa e registra 8 extensões", async () => {
    await WorkflowExtensionsPlugin.activate?.({
      bus: { emit: () => {}, on: () => () => {}, history: () => [] },
      permissions: {
        grant: () => {},
        revoke: () => {},
        can: () => true,
        listForPlugin: () => [],
      },
      logger: () => {},
    });
    const d = collectWorkflowSdkDiagnostics();
    expect(d.total).toBe(8);
    await WorkflowExtensionsPlugin.deactivate?.();
    expect(collectWorkflowSdkDiagnostics().total).toBe(0);
  });
});
