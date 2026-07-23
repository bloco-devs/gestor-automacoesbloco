import { describe, it, expect, beforeEach } from "vitest";
import { pluginRegistry } from "../core/registry";
import { definePlugin } from "../core/definePlugin";
import { resolveDependencies } from "../core/dependency-resolver";
import { createEventBus } from "../events/eventBus";
import { createPermissions } from "../permissions/permissions";

beforeEach(() => pluginRegistry.__resetForTests());

describe("PluginRegistry", () => {
  it("registra e lista plugins", () => {
    pluginRegistry.register(
      definePlugin({ id: "a", name: "A", version: "1.0.0", category: "misc" })
    );
    expect(pluginRegistry.list()).toHaveLength(1);
    expect(pluginRegistry.get("a")?.status).toBe("registered");
  });

  it("rejeita duplicatas", () => {
    pluginRegistry.register({ id: "a", name: "A", version: "1.0.0", category: "misc" });
    expect(() =>
      pluginRegistry.register({ id: "a", name: "A2", version: "1.0.1", category: "misc" })
    ).toThrow();
  });

  it("ativa plugins e chama activate()", async () => {
    let activated = false;
    pluginRegistry.register({
      id: "p1",
      name: "P1",
      version: "1.0.0",
      category: "misc",
      activate: () => {
        activated = true;
      },
    });
    const res = await pluginRegistry.activateAll();
    expect(activated).toBe(true);
    expect(res.activated).toContain("p1");
    expect(pluginRegistry.get("p1")?.status).toBe("active");
  });

  it("agrega commands e widgets apenas de plugins ativos", async () => {
    pluginRegistry.register({
      id: "p1",
      name: "P1",
      version: "1.0.0",
      category: "misc",
      commands: [{ id: "c1", title: "Cmd", run: () => {} }],
      widgets: [{ id: "w1", slot: "dashboard", render: () => null }],
    });
    expect(pluginRegistry.commands()).toHaveLength(0); // ainda não ativo
    await pluginRegistry.activateAll();
    expect(pluginRegistry.commands()).toHaveLength(1);
    expect(pluginRegistry.widgets("dashboard")).toHaveLength(1);
    expect(pluginRegistry.widgets("portal")).toHaveLength(0);
  });
});

describe("resolveDependencies", () => {
  it("retorna ordem topológica correta", () => {
    const { order, issues } = resolveDependencies([
      { id: "b", name: "B", version: "1.0.0", category: "misc", dependencies: [{ pluginId: "a" }] },
      { id: "a", name: "A", version: "1.0.0", category: "misc" },
    ]);
    expect(issues).toEqual([]);
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
  });

  it("detecta dependência ausente", () => {
    const { issues } = resolveDependencies([
      { id: "a", name: "A", version: "1.0.0", category: "misc", dependencies: [{ pluginId: "missing" }] },
    ]);
    expect(issues.some((i) => i.kind === "missing")).toBe(true);
  });

  it("detecta versão incompatível", () => {
    const { issues } = resolveDependencies([
      { id: "a", name: "A", version: "1.0.0", category: "misc" },
      {
        id: "b",
        name: "B",
        version: "1.0.0",
        category: "misc",
        dependencies: [{ pluginId: "a", version: "^2.0.0" }],
      },
    ]);
    expect(issues.some((i) => i.kind === "version")).toBe(true);
  });

  it("detecta ciclos", () => {
    const { issues } = resolveDependencies([
      { id: "a", name: "A", version: "1.0.0", category: "misc", dependencies: [{ pluginId: "b" }] },
      { id: "b", name: "B", version: "1.0.0", category: "misc", dependencies: [{ pluginId: "a" }] },
    ]);
    expect(issues.some((i) => i.kind === "cycle")).toBe(true);
  });
});

describe("EventBus", () => {
  it("entrega eventos tipados", () => {
    const bus = createEventBus();
    const received: string[] = [];
    bus.on("demand.created", (p) => received.push(p.demandId));
    bus.emit("demand.created", { demandId: "d1" });
    bus.emit("demand.created", { demandId: "d2" });
    expect(received).toEqual(["d1", "d2"]);
  });

  it("permite unsubscribe", () => {
    const bus = createEventBus();
    let count = 0;
    const off = bus.on("feature.enabled", () => count++);
    bus.emit("feature.enabled", { flag: "x", enabled: true });
    off();
    bus.emit("feature.enabled", { flag: "x", enabled: false });
    expect(count).toBe(1);
  });

  it("mantém histórico limitado", () => {
    const bus = createEventBus();
    for (let i = 0; i < 150; i++) bus.emit("feature.enabled", { flag: `f${i}`, enabled: true });
    expect(bus.history().length).toBe(100);
  });

  it("isola erros de listeners", () => {
    const bus = createEventBus();
    bus.on("demand.created", () => {
      throw new Error("boom");
    });
    let ok = false;
    bus.on("demand.created", () => {
      ok = true;
    });
    bus.emit("demand.created", { demandId: "x" });
    expect(ok).toBe(true);
  });
});

describe("Permissions", () => {
  it("grant/can/revoke", () => {
    const perms = createPermissions();
    expect(perms.can("p1", "read.demands")).toBe(false);
    perms.grant("p1", "read.demands");
    expect(perms.can("p1", "read.demands")).toBe(true);
    perms.revoke("p1", "read.demands");
    expect(perms.can("p1", "read.demands")).toBe(false);
  });

  it("lista capacidades por plugin", () => {
    const perms = createPermissions();
    perms.grant("p1", "a");
    perms.grant("p1", "b");
    expect(perms.listForPlugin("p1").sort()).toEqual(["a", "b"]);
  });
});

describe("Manifest / definePlugin", () => {
  it("é identity function", () => {
    const m = definePlugin({ id: "x", name: "X", version: "1.0.0", category: "misc" });
    expect(m.id).toBe("x");
  });

  it("permite ciclo completo com deps + activate + provides", async () => {
    pluginRegistry.register(
      definePlugin({
        id: "core-lib",
        name: "Core Lib",
        version: "1.0.0",
        category: "misc",
        permissions: { provides: ["utils.parse"] },
      })
    );
    pluginRegistry.register(
      definePlugin({
        id: "consumer",
        name: "Consumer",
        version: "1.0.0",
        category: "workspace",
        dependencies: [{ pluginId: "core-lib", version: "^1.0.0" }],
      })
    );
    const res = await pluginRegistry.activateAll();
    expect(res.activated).toEqual(expect.arrayContaining(["core-lib", "consumer"]));
    expect(res.issues).toEqual([]);
  });
});
