import { describe, it, expect, beforeEach } from "vitest";
import { scanPlugins } from "../runtime/scanner";
import { validateManifest } from "../runtime/validator";
import { diagnoseDependencies } from "../runtime/dependency";
import { runLifecycle } from "../runtime/lifecycle";
import { PluginHost } from "../runtime/host";
import { PluginRenderer } from "../runtime/renderer";
import {
  registerWidget,
  registerCommand,
  registerSidebarItem,
  registerCapability,
} from "../runtime/developer";
import { platformRenderer } from "../runtime/renderer";
import { platformPermissions } from "../permissions/permissions";
import { HelloPlugin } from "../runtime/plugins/hello";
import { platformBus } from "../events/eventBus";

describe("Scanner", () => {
  it("aceita manifests estáticos", async () => {
    const res = await scanPlugins([HelloPlugin]);
    expect(res.manifests).toHaveLength(1);
    expect(res.errors).toEqual([]);
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("aceita dynamic imports", async () => {
    const res = await scanPlugins([async () => ({ default: HelloPlugin })]);
    expect(res.manifests).toHaveLength(1);
  });

  it("captura erros de dynamic import sem lançar", async () => {
    const res = await scanPlugins([
      async () => {
        throw new Error("boom");
      },
    ]);
    expect(res.manifests).toHaveLength(0);
    expect(res.errors).toHaveLength(1);
  });
});

describe("Validator", () => {
  it("aprova manifest válido", () => {
    const r = validateManifest(HelloPlugin);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("reprova manifest sem id", () => {
    const r = validateManifest({ name: "x", version: "1.0.0", category: "misc" });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/id/);
  });

  it("reprova widget com slot inválido", () => {
    const r = validateManifest({
      id: "x",
      name: "x",
      version: "1.0.0",
      category: "misc",
      widgets: [{ id: "w", slot: "not-a-slot", render: () => null }],
    });
    expect(r.valid).toBe(false);
  });

  it("gera warning para versão não-semver", () => {
    const r = validateManifest({ id: "x", name: "x", version: "abc", category: "misc" });
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("Dependency diagnostics", () => {
  it("produz ordem, cadeias e órfãos", () => {
    const d = diagnoseDependencies([
      { id: "a", name: "A", version: "1.0.0", category: "misc" },
      {
        id: "b",
        name: "B",
        version: "1.0.0",
        category: "misc",
        dependencies: [{ pluginId: "a" }],
      },
      { id: "solo", name: "Solo", version: "1.0.0", category: "misc" },
    ]);
    expect(d.order.indexOf("a")).toBeLessThan(d.order.indexOf("b"));
    expect(d.chains.b).toContain("a");
    expect(d.orphans).toContain("solo");
  });
});

describe("Lifecycle", () => {
  it("executa hook e mede tempo", async () => {
    let called = false;
    const ev = await runLifecycle(
      {
        id: "x",
        name: "x",
        version: "1.0.0",
        category: "misc",
        onLoad: () => {
          called = true;
        },
      },
      "load",
      { bus: platformBus, permissions: platformPermissions, logger: () => {} }
    );
    expect(called).toBe(true);
    expect(ev.error).toBeUndefined();
  });

  it("isola erros", async () => {
    const ev = await runLifecycle(
      {
        id: "x",
        name: "x",
        version: "1.0.0",
        category: "misc",
        onEnable: () => {
          throw new Error("nope");
        },
      },
      "enable",
      { bus: platformBus, permissions: platformPermissions, logger: () => {} }
    );
    expect(ev.error).toBe("nope");
  });
});

describe("PluginRenderer", () => {
  it("registra e filtra widgets por slot", () => {
    const r = new PluginRenderer();
    r.registerWidget({ pluginId: "p", id: "w1", slot: "dashboard", render: () => null });
    r.registerWidget({ pluginId: "p", id: "w2", slot: "portal", render: () => null });
    expect(r.listWidgets("dashboard")).toHaveLength(1);
    expect(r.listWidgets()).toHaveLength(2);
  });

  it("remove tudo de um plugin", () => {
    const r = new PluginRenderer();
    r.registerWidget({ pluginId: "p", id: "w1", slot: "dashboard", render: () => null });
    r.registerCommand({ pluginId: "p", id: "c1", title: "t", run: () => {} });
    r.unregisterPlugin("p");
    expect(r.listWidgets()).toHaveLength(0);
    expect(r.listCommands()).toHaveLength(0);
  });
});

describe("PluginHost", () => {
  beforeEach(() => {
    platformRenderer.__resetForTests();
  });

  it("inicializa e ativa HelloPlugin", async () => {
    const host = new PluginHost(new PluginRenderer());
    const diag = await host.initialize([HelloPlugin]);
    expect(diag.plugins[0]?.status).toBe("active");
    expect(diag.dependencies?.issues).toEqual([]);
    expect(host.widgets("dashboard")).toHaveLength(1);
    expect(host.commands()).toHaveLength(1);
  });

  it("rejeita manifest inválido sem derrubar", async () => {
    const host = new PluginHost(new PluginRenderer());
    // @ts-expect-error test bad manifest
    const diag = await host.initialize([{ id: "x", version: "1.0.0" }]);
    expect(diag.plugins[0]?.status).toBe("rejected");
  });

  it("disable remove widgets/commands e reload restaura", async () => {
    const renderer = new PluginRenderer();
    const host = new PluginHost(renderer);
    await host.initialize([HelloPlugin]);
    await host.disable("hello-plugin");
    expect(renderer.listWidgets()).toHaveLength(0);
    await host.enable("hello-plugin");
    expect(renderer.listWidgets()).toHaveLength(1);
  });

  it("erro em activate marca plugin como error", async () => {
    const host = new PluginHost(new PluginRenderer());
    const diag = await host.initialize([
      {
        id: "bad",
        name: "bad",
        version: "1.0.0",
        category: "misc",
        activate: () => {
          throw new Error("kaboom");
        },
      },
    ]);
    expect(diag.plugins[0]?.status).toBe("error");
  });

  it("dependência ausente bloqueia ativação", async () => {
    const host = new PluginHost(new PluginRenderer());
    const diag = await host.initialize([
      {
        id: "needs-missing",
        name: "x",
        version: "1.0.0",
        category: "misc",
        dependencies: [{ pluginId: "ghost" }],
      },
    ]);
    expect(diag.plugins[0]?.status).toBe("error");
  });
});

describe("Developer API", () => {
  beforeEach(() => platformRenderer.__resetForTests());

  it("registra widget/command/sidebar/capability", () => {
    registerWidget("dev", { id: "w", slot: "admin", render: () => null });
    registerCommand("dev", { id: "c", title: "t", run: () => {} });
    registerSidebarItem("dev", { id: "s", label: "S" });
    registerCapability("dev", "cap.test");
    expect(platformRenderer.listWidgets()).toHaveLength(1);
    expect(platformRenderer.listCommands()).toHaveLength(1);
    expect(platformRenderer.listSidebarItems()).toHaveLength(1);
    expect(platformPermissions.can("dev", "cap.test")).toBe(true);
  });
});

describe("HelloPlugin", () => {
  it("carrega no host e registra tudo", async () => {
    const renderer = new PluginRenderer();
    const host = new PluginHost(renderer);
    const diag = await host.initialize([HelloPlugin]);
    const rec = diag.plugins.find((p) => p.id === "hello-plugin");
    expect(rec?.status).toBe("active");
    expect(renderer.listCommands().some((c) => c.id === "hello.say")).toBe(true);
    expect(platformPermissions.can("hello-plugin", "hello.greet")).toBe(true);
  });
});
