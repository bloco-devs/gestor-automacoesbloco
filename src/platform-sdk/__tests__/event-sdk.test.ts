/**
 * PLUGIN 006 — Event Automation SDK.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  eventExtensionRegistry,
  dispatchEvent,
  bootstrapEventSdkProvider,
  __resetEventSdkBootstrap,
  __resetEventSdkDiagnostics,
  collectEventSdkDiagnostics,
  EVENT_SDK_CONTRACT,
  eventSdkService,
  definePipeline,
  describePipeline,
  DEFAULT_PIPELINE,
  type EventExtension,
  type EventSubscriber,
  type EventMiddleware,
  type EventInterceptor,
} from "../event-sdk";
import { serviceRegistry } from "../services/registry/registry";
import EventAutomationPlugin from "@/plugins/event-automation";

function resetAll() {
  eventExtensionRegistry.__reset();
  __resetEventSdkDiagnostics();
  __resetEventSdkBootstrap();
}

beforeEach(() => {
  resetAll();
});

describe("Registry", () => {
  it("registra e remove por plugin", () => {
    const ext: EventSubscriber = {
      kind: "subscriber",
      id: "a",
      pluginId: "p1",
      event: "e1",
      handler: () => {},
    };
    eventExtensionRegistry.register(ext);
    expect(eventExtensionRegistry.subscribers("e1")).toHaveLength(1);
    expect(eventExtensionRegistry.removePlugin("p1")).toBe(1);
    expect(eventExtensionRegistry.subscribers()).toHaveLength(0);
  });

  it("dedup por (kind:id)", () => {
    const a: EventSubscriber = {
      kind: "subscriber",
      id: "x",
      pluginId: "p",
      event: "e",
      handler: () => {},
    };
    eventExtensionRegistry.register(a);
    eventExtensionRegistry.register({ ...a, priority: 1 });
    expect(eventExtensionRegistry.subscribers()).toHaveLength(1);
  });

  it("diagnostics conta por kind/plugin/event", () => {
    eventExtensionRegistry.registerAll([
      {
        kind: "subscriber",
        id: "s1",
        pluginId: "p",
        event: "e",
        handler: () => {},
      },
      {
        kind: "publisher",
        id: "pub1",
        pluginId: "p",
        event: "e",
      } as EventExtension,
    ]);
    const d = eventExtensionRegistry.diagnostics();
    expect(d.total).toBe(2);
    expect(d.byKind.subscriber).toBe(1);
    expect(d.byPlugin.p).toBe(2);
    expect(d.byEvent.e).toBe(2);
  });
});

describe("Dispatcher", () => {
  it("invoca subscribers na ordem de priority", async () => {
    const order: string[] = [];
    eventExtensionRegistry.registerAll([
      {
        kind: "subscriber",
        id: "low",
        pluginId: "p",
        event: "e",
        priority: 100,
        handler: () => {
          order.push("low");
        },
      },
      {
        kind: "subscriber",
        id: "high",
        pluginId: "p",
        event: "e",
        priority: 10,
        handler: () => {
          order.push("high");
        },
      },
    ]);
    const r = await dispatchEvent("e", { hi: 1 });
    expect(order).toEqual(["high", "low"]);
    expect(r.invoked).toBe(2);
    expect(r.cancelled).toBe(false);
  });

  it("respeita filter e once", async () => {
    let invoked = 0;
    const s: EventSubscriber = {
      kind: "subscriber",
      id: "once",
      pluginId: "p",
      event: "e",
      once: true,
      filter: (env) => (env.payload as any).ok === true,
      handler: () => {
        invoked++;
      },
    };
    eventExtensionRegistry.register(s);
    await dispatchEvent("e", { ok: false });
    await dispatchEvent("e", { ok: true });
    await dispatchEvent("e", { ok: true });
    expect(invoked).toBe(1);
    expect(eventExtensionRegistry.subscribers("e")).toHaveLength(0);
  });

  it("captura erros sem lançar", async () => {
    eventExtensionRegistry.register({
      kind: "subscriber",
      id: "boom",
      pluginId: "p",
      event: "e",
      handler: () => {
        throw new Error("nope");
      },
    });
    const r = await dispatchEvent("e", {});
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].error).toContain("nope");
  });
});

describe("Interceptors", () => {
  it("cancela evento", async () => {
    const it: EventInterceptor = {
      kind: "interceptor",
      id: "veto",
      pluginId: "p",
      event: "e",
      intercept: () => ({ type: "cancel", reason: "test" }),
    };
    eventExtensionRegistry.register(it);
    eventExtensionRegistry.register({
      kind: "subscriber",
      id: "s",
      pluginId: "p",
      event: "e",
      handler: () => {
        throw new Error("nao deveria rodar");
      },
    });
    const r = await dispatchEvent("e", {});
    expect(r.cancelled).toBe(true);
    expect(r.cancelReason).toBe("test");
    expect(r.invoked).toBe(0);
  });

  it("rewritePayload e skipSubscriber", async () => {
    let seen: any = null;
    eventExtensionRegistry.registerAll([
      {
        kind: "interceptor",
        id: "rw",
        pluginId: "p",
        event: "e",
        intercept: () => ({ type: "rewritePayload", payload: { ok: 42 } }),
      },
      {
        kind: "interceptor",
        id: "skip",
        pluginId: "p",
        event: "e",
        intercept: () => ({ type: "skipSubscriber", subscriberId: "b" }),
      },
      {
        kind: "subscriber",
        id: "a",
        pluginId: "p",
        event: "e",
        handler: (env) => {
          seen = env.payload;
        },
      },
      {
        kind: "subscriber",
        id: "b",
        pluginId: "p",
        event: "e",
        handler: () => {
          throw new Error("skipped");
        },
      },
    ]);
    const r = await dispatchEvent("e", { ok: 1 });
    expect(seen).toEqual({ ok: 42 });
    expect(r.invoked).toBe(1);
  });
});

describe("Middleware", () => {
  it("Express-like next/rewrite/cancel", async () => {
    const trace: string[] = [];
    const mw1: EventMiddleware = {
      kind: "middleware",
      id: "m1",
      pluginId: "p",
      phase: "beforePublish",
      priority: 10,
      run: async (ctx, next) => {
        trace.push("m1:in");
        ctx.rewrite({ metadata: { tagged: true } });
        await next();
        trace.push("m1:out");
      },
    };
    const mw2: EventMiddleware = {
      kind: "middleware",
      id: "m2",
      pluginId: "p",
      phase: "beforePublish",
      priority: 20,
      run: async (ctx, next) => {
        trace.push("m2");
        await next();
      },
    };
    eventExtensionRegistry.registerAll([mw1, mw2]);
    let metaSeen: any = null;
    eventExtensionRegistry.register({
      kind: "subscriber",
      id: "s",
      pluginId: "p",
      event: "e",
      handler: (env) => {
        metaSeen = env.metadata;
      },
    });
    await dispatchEvent("e", {});
    expect(trace).toEqual(["m1:in", "m2", "m1:out"]);
    expect(metaSeen).toMatchObject({ tagged: true });
  });

  it("cancel via middleware", async () => {
    eventExtensionRegistry.register({
      kind: "middleware",
      id: "veto",
      pluginId: "p",
      phase: "beforePublish",
      run: (ctx) => {
        ctx.cancel("blocked");
      },
    });
    eventExtensionRegistry.register({
      kind: "subscriber",
      id: "s",
      pluginId: "p",
      event: "e",
      handler: () => {
        throw new Error("should not run");
      },
    });
    const r = await dispatchEvent("e", {});
    expect(r.cancelled).toBe(true);
    expect(r.invoked).toBe(0);
  });
});

describe("Pipeline SDK", () => {
  it("describePipeline retorna default quando não registrado", () => {
    expect(describePipeline("unknown")).toEqual(DEFAULT_PIPELINE);
  });

  it("definePipeline registra pipeline resolvível", () => {
    eventExtensionRegistry.register(
      definePipeline({
        id: "p1",
        pluginId: "p",
        event: "e",
        steps: ["beforePublish", "afterPublish"],
      })
    );
    expect(describePipeline("e")).toEqual(["beforePublish", "afterPublish"]);
  });
});

describe("Service Mesh integration", () => {
  it("bootstrap publica service.event-sdk", () => {
    bootstrapEventSdkProvider();
    const providers = serviceRegistry.list();
    const found = providers.find(
      (p) => (p.contract as unknown as string) === EVENT_SDK_CONTRACT
    );
    expect(found?.id).toBe("platform.core.event-sdk");
  });

  it("eventSdkService.publish delega ao dispatcher", async () => {
    let seen = 0;
    eventExtensionRegistry.register({
      kind: "subscriber",
      id: "s",
      pluginId: "p",
      event: "e",
      handler: () => {
        seen++;
      },
    });
    await eventSdkService.publish("e", { x: 1 });
    expect(seen).toBe(1);
  });
});

describe("Diagnostics", () => {
  it("mede tempo médio e erros", async () => {
    eventExtensionRegistry.register({
      kind: "subscriber",
      id: "boom",
      pluginId: "p",
      event: "e",
      handler: () => {
        throw new Error("x");
      },
    });
    await dispatchEvent("e", {});
    await dispatchEvent("e", {});
    const d = collectEventSdkDiagnostics();
    expect(d.totalDispatched).toBe(2);
    expect(d.totalErrors).toBe(2);
    expect(d.recentEvents.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Plugin exemplo", () => {
  it("activate registra extensões via mesh, deactivate remove", () => {
    // Simula um context mínimo compatível com o manifest.
    (EventAutomationPlugin.activate as any)?.({});
    const total = eventExtensionRegistry.diagnostics().total;
    expect(total).toBeGreaterThanOrEqual(7);
    (EventAutomationPlugin.deactivate as any)?.({});
    expect(
      eventExtensionRegistry.diagnostics().byPlugin["event-automation.example"] ??
        0
    ).toBe(0);
  });

  it("interceptor do plugin bloqueia payload inválido", async () => {
    (EventAutomationPlugin.activate as any)?.({});
    const r = await eventSdkService.publish("demand.created", {});
    expect(r.cancelled).toBe(true);
    (EventAutomationPlugin.deactivate as any)?.({});
  });
});
