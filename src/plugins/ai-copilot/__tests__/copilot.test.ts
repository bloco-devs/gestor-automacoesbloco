import { describe, it, expect, beforeEach } from "vitest";
import { PluginHost } from "@/platform-sdk/runtime/host";
import { PluginRenderer } from "@/platform-sdk/runtime/renderer";
import { validateManifest } from "@/platform-sdk/runtime/validator";
import { platformPermissions } from "@/platform-sdk/permissions/permissions";

import AICopilotPlugin from "../manifest";
import { routePrompt, ALL_PROMPTS } from "../prompts";
import { COPILOT_ACTIONS, actionsFor } from "../actions";
import {
  emitCopilotEvent,
  onCopilotEvent,
  copilotEventHistory,
  __resetCopilotEventsForTests,
} from "../events";
import {
  appendMessage,
  listMessages,
  clearMemory,
  __resetMemoryForTests,
} from "../memory";
import { copilotCommands, runAction } from "../commands";
import { listDiagnostics, __resetDiagnosticsForTests } from "../utils/diagnostics";
import { contextEngine, type WorkspaceContext } from "@/modules/context";

function fakeContext(patch: Partial<WorkspaceContext> = {}): WorkspaceContext {
  return {
    workspace: "developer",
    module: "kanban",
    page: "kanban",
    route: "/admin/demandas",
    entityType: "solicitacao",
    entityId: "d-1",
    selectedItems: [],
    organizationId: null,
    currentUser: { id: "u1", role: "developer" },
    breadcrumbs: [],
    filters: {},
    metadata: {},
    updatedAt: Date.now(),
    ...patch,
  };
}

describe("AI Copilot · manifest", () => {
  it("manifest é válido", () => {
    const r = validateManifest(AICopilotPlugin);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("declara capabilities esperadas", () => {
    expect(AICopilotPlugin.permissions?.provides).toContain("ai.chat");
    expect(AICopilotPlugin.permissions?.provides).toContain("ai.context");
    expect(AICopilotPlugin.permissions?.provides).toContain("ai.actions");
  });

  it("expõe os 5 commands documentados", () => {
    const ids = copilotCommands.map((c) => c.id).sort();
    expect(ids).toEqual(
      ["copilot.ask", "copilot.explain", "copilot.generate", "copilot.open", "copilot.summarize"],
    );
  });

  it("registra widgets em extension points oficiais", () => {
    const slots = (AICopilotPlugin.widgets ?? []).map((w) => w.slot);
    for (const s of ["copilot", "workspace", "contextPanel", "portal", "analytics", "operations", "commandPalette"]) {
      expect(slots).toContain(s);
    }
  });
});

describe("AI Copilot · prompt router", () => {
  it("seleciona portal em /portal", () => {
    expect(routePrompt(fakeContext({ route: "/portal" })).id).toBe("prompt.portal");
  });
  it("seleciona analytics em /admin/analytics", () => {
    expect(routePrompt(fakeContext({ route: "/admin/analytics" })).id).toBe(
      "prompt.analytics",
    );
  });
  it("seleciona ecossistema em /ecossistema", () => {
    expect(routePrompt(fakeContext({ route: "/ecossistema" })).id).toBe(
      "prompt.ecossistema",
    );
  });
  it("cai no default para rota desconhecida", () => {
    expect(routePrompt(fakeContext({ route: "/unknown", module: "unknown" })).id).toBe(
      "prompt.default",
    );
  });
  it("expõe todos os prompts registrados", () => {
    expect(ALL_PROMPTS.length).toBeGreaterThanOrEqual(9);
  });
});

describe("AI Copilot · quick actions", () => {
  it("filtra ações por módulo", () => {
    const kanban = actionsFor("kanban").map((a) => a.id);
    expect(kanban).toContain("copilot.subtasks");
    const dashboard = actionsFor("dashboard").map((a) => a.id);
    // Ações globais aparecem em qualquer módulo
    expect(dashboard).toContain("copilot.summarize");
    // Ações scoped não aparecem fora
    expect(dashboard).not.toContain("copilot.reply-user");
  });

  it("buildPrompt monta contexto", () => {
    const a = COPILOT_ACTIONS.find((x) => x.id === "copilot.summarize")!;
    const p = a.buildPrompt(fakeContext());
    expect(p).toContain("rota=/admin/demandas");
    expect(p).toContain("módulo=kanban");
  });
});

describe("AI Copilot · memory", () => {
  beforeEach(() => __resetMemoryForTests());
  it("apende e limpa", () => {
    appendMessage({ id: "m1", role: "user", content: "oi", at: Date.now() });
    expect(listMessages()).toHaveLength(1);
    clearMemory();
    expect(listMessages()).toHaveLength(0);
  });
});

describe("AI Copilot · event bus (scoped)", () => {
  beforeEach(() => __resetCopilotEventsForTests());
  it("emite e escuta", () => {
    let seen: unknown = null;
    onCopilotEvent("copilot.opened", (p) => (seen = p));
    emitCopilotEvent("copilot.opened", { at: 1, source: "test" });
    expect(seen).toEqual({ at: 1, source: "test" });
    expect(copilotEventHistory()).toHaveLength(1);
  });
});

describe("AI Copilot · developer tools + runAction", () => {
  beforeEach(() => {
    __resetDiagnosticsForTests();
    __resetMemoryForTests();
    __resetCopilotEventsForTests();
    // Aponta o context engine para um estado conhecido
    contextEngine.patchMetadata({});
  });

  it("runAction registra diagnóstico + evento + mensagem", () => {
    const a = COPILOT_ACTIONS.find((x) => x.id === "copilot.summarize")!;
    runAction(a, "test");
    const diags = listDiagnostics();
    expect(diags.length).toBe(1);
    expect(diags[0].actionId).toContain("copilot.summarize");
    expect(diags[0].tokensEstimated).toBeGreaterThan(0);
    expect(listMessages()).toHaveLength(1);
    expect(copilotEventHistory().map((e) => e.name)).toContain(
      "copilot.prompt.generated",
    );
    expect(copilotEventHistory().map((e) => e.name)).toContain(
      "copilot.action.executed",
    );
  });
});

describe("AI Copilot · lifecycle no PluginHost", () => {
  it("carrega e ativa via PluginHost sem tocar no core", async () => {
    const host = new PluginHost(new PluginRenderer());
    const diag = await host.initialize([AICopilotPlugin]);
    const rec = diag.plugins.find((p) => p.id === "plugin.ai-copilot");
    expect(rec?.status).toBe("active");
    expect(platformPermissions.can("plugin.ai-copilot", "ai.chat")).toBe(true);
    // widgets registrados em múltiplos slots
    expect(host.widgets("copilot").length).toBeGreaterThan(0);
    expect(host.widgets("contextPanel").length).toBeGreaterThan(0);
    expect(host.commands().map((c) => c.id)).toContain("copilot.open");
  });
});
