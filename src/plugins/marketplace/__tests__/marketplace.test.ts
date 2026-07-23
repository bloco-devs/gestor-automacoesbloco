import { describe, it, expect, beforeEach } from "vitest";
import { pluginHost } from "@/platform-sdk/runtime";
import HelloPlugin from "@/platform-sdk/runtime/plugins/hello";
import AICopilotPlugin from "@/plugins/ai-copilot";
import {
  buildCatalog,
  applyFilter,
} from "../catalog";
import { computeHealth } from "../diagnostics";
import { checkCompatibility, SDK_VERSION, HOST_VERSION } from "../compatibility";
import { pluginManager } from "../manager";
import { pluginInstaller } from "../installer";
import { buildDependencyMermaid } from "../utils/mermaid";
import { BUNDLED_PLUGINS, bundledSources, originOf } from "../registry";

async function bootHost() {
  pluginHost.__resetForTests();
  await pluginHost.initialize([HelloPlugin, AICopilotPlugin]);
}

describe("Marketplace · Registry", () => {
  it("expõe plugins bundled", () => {
    expect(BUNDLED_PLUGINS.length).toBeGreaterThanOrEqual(2);
    expect(bundledSources().map((m) => m.id)).toContain("plugin.ai-copilot");
    expect(originOf("plugin.ai-copilot")).toBe("bundled");
    expect(originOf("desconhecido")).toBe("remote");
  });
});

describe("Marketplace · Catalog", () => {
  beforeEach(async () => {
    await bootHost();
  });

  it("lista todos os plugins conhecidos", () => {
    const diag = pluginHost.diagnostics();
    const catalog = buildCatalog(diag);
    const ids = catalog.map((e) => e.id);
    expect(ids).toContain("hello-plugin");
    expect(ids).toContain("plugin.ai-copilot");
    expect(catalog.every((e) => e.manifest)).toBe(true);
  });

  it("filtro por busca funciona", () => {
    const diag = pluginHost.diagnostics();
    const catalog = buildCatalog(diag);
    const filtered = applyFilter(catalog, { query: "copilot" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("plugin.ai-copilot");
  });

  it("filtro por categoria funciona", () => {
    const diag = pluginHost.diagnostics();
    const catalog = buildCatalog(diag);
    expect(applyFilter(catalog, { category: "ai" }).length).toBe(1);
    expect(applyFilter(catalog, { category: "misc" }).length).toBe(1);
  });

  it("ordenação preserva total", () => {
    const diag = pluginHost.diagnostics();
    const catalog = buildCatalog(diag);
    const byName = applyFilter(catalog, { sort: "name" });
    const byStatus = applyFilter(catalog, { sort: "status" });
    expect(byName.length).toBe(byStatus.length);
  });
});

describe("Marketplace · Health & Compatibility", () => {
  beforeEach(async () => {
    await bootHost();
  });

  it("computa health por plugin", () => {
    const diag = pluginHost.diagnostics();
    const catalog = buildCatalog(diag);
    const entry = catalog.find((e) => e.id === "plugin.ai-copilot")!;
    const health = computeHealth(entry, diag);
    expect(health.lifecycleState).toBe("active");
    expect(health.loadTimeMs).toBeGreaterThanOrEqual(0);
    expect(health.memoryEstimateKb).toBeGreaterThan(0);
  });

  it("verifica compatibilidade com SDK/Host", () => {
    const diag = pluginHost.diagnostics();
    const catalog = buildCatalog(diag);
    const entry = catalog[0];
    const report = checkCompatibility(entry, catalog.map((e) => e.id));
    expect(report.sdkVersion).toBe(SDK_VERSION);
    expect(report.hostVersion).toBe(HOST_VERSION);
    expect(report.compatible).toBe(true);
  });

  it("detecta dependência ausente", () => {
    const fake = {
      id: "x.plugin",
      name: "X",
      version: "1.0.0",
      category: "misc" as const,
      dependencies: [{ pluginId: "does-not-exist" }],
    };
    const entry = {
      ...fake,
      status: "unregistered" as const,
      origin: "bundled" as const,
      capabilitiesRequired: [],
      capabilitiesProvided: [],
      extensionPoints: [],
      commands: 0,
      widgets: 0,
      issues: [],
      warnings: [],
      manifest: fake as never,
    };
    const report = checkCompatibility(entry, ["hello-plugin"]);
    expect(report.compatible).toBe(false);
    expect(report.missingDependencies).toContain("does-not-exist");
  });
});

describe("Marketplace · Manager", () => {
  beforeEach(async () => {
    await bootHost();
  });

  it("desabilita e habilita plugin", async () => {
    const r1 = await pluginManager.disable("hello-plugin");
    expect(r1.ok).toBe(true);
    expect(pluginHost.list().find((p) => p.id === "hello-plugin")?.status).toBe("disabled");
    const r2 = await pluginManager.enable("hello-plugin");
    expect(r2.ok).toBe(true);
    expect(pluginHost.list().find((p) => p.id === "hello-plugin")?.status).toBe("active");
  });

  it("reload é idempotente", async () => {
    const r = await pluginManager.reload("hello-plugin");
    expect(r.ok).toBe(true);
    expect(pluginHost.list().find((p) => p.id === "hello-plugin")?.status).toBe("active");
  });

  it("simulateUpdate mantém o plugin ativo", async () => {
    const r = await pluginManager.simulateUpdate("hello-plugin");
    expect(r.ok).toBe(true);
    expect(r.message).toContain("v2.1");
  });
});

describe("Marketplace · Installer", () => {
  it("instalação remota está desabilitada nesta versão", () => {
    const res = pluginInstaller.install({ kind: "remote", url: "https://x" });
    expect(res.ok).toBe(false);
    expect(pluginInstaller.supportsRemote).toBe(false);
  });

  it("instalação bundled devolve manifest", () => {
    const res = pluginInstaller.install({ kind: "bundled", manifest: HelloPlugin });
    expect(res.ok).toBe(true);
    expect(res.manifest?.id).toBe("hello-plugin");
  });
});

describe("Marketplace · Dependency Graph", () => {
  beforeEach(async () => {
    await bootHost();
  });

  it("gera texto Mermaid válido", () => {
    const diag = pluginHost.diagnostics();
    const catalog = buildCatalog(diag);
    const text = buildDependencyMermaid(catalog);
    expect(text.startsWith("graph TD")).toBe(true);
    expect(text).toContain("Plugin Host");
    expect(text).toContain("Platform SDK");
    expect(text).toContain("plugin_ai_copilot");
  });
});
