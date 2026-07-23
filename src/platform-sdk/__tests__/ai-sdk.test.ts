/**
 * PLUGIN 007 — AI Skills SDK + Prompt Registry.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  aiExtensionRegistry,
  aiSdkService,
  bootstrapAiSdkProvider,
  __resetAiSdkBootstrap,
  AI_SDK_CONTRACT,
  defineSkill,
  definePrompt,
  defineTool,
  defineContextBuilder,
  defineAgent,
  createInMemoryProvider,
  resolveAi,
  findPromptBySlot,
  renderUserTemplate,
  buildContext,
  runSkill,
  runTool,
  runAgent,
  collectAiSdkDiagnostics,
} from "../ai-sdk";
import { serviceRegistry } from "../services/registry/registry";
import AiSkillsPlugin from "@/plugins/ai-skills";

function reset() {
  aiExtensionRegistry.__reset();
  __resetAiSdkBootstrap();
}

beforeEach(() => reset());

describe("Registry", () => {
  it("registra e remove por plugin", () => {
    aiExtensionRegistry.register(
      defineSkill({
        id: "a",
        pluginId: "p1",
        title: "A",
        execute: () => ({ ok: true }),
      })
    );
    expect(aiExtensionRegistry.skills()).toHaveLength(1);
    expect(aiExtensionRegistry.removePlugin("p1")).toBe(1);
  });

  it("dedup por (kind:id)", () => {
    const s = defineSkill({
      id: "x",
      pluginId: "p",
      title: "X",
      execute: () => ({ ok: true }),
    });
    aiExtensionRegistry.register(s);
    aiExtensionRegistry.register({ ...s, title: "Y" });
    expect(aiExtensionRegistry.skills()).toHaveLength(1);
    expect(aiExtensionRegistry.skills()[0].title).toBe("Y");
  });
});

describe("Skill SDK", () => {
  it("runSkill executa e mede tempo", async () => {
    aiExtensionRegistry.register(
      defineSkill({
        id: "s",
        pluginId: "p",
        title: "S",
        execute: () => ({ ok: true, output: 42 }),
      })
    );
    const r = await runSkill("s", {});
    expect(r.ok).toBe(true);
    expect(r.output).toBe(42);
    expect(typeof r.durationMs).toBe("number");
  });

  it("skill inexistente devolve erro sem lançar", async () => {
    const r = await runSkill("nope", {});
    expect(r.ok).toBe(false);
    expect(r.error).toContain("not found");
  });

  it("skill desabilitada não roda", async () => {
    aiExtensionRegistry.register(
      defineSkill({
        id: "off",
        pluginId: "p",
        title: "Off",
        enabled: false,
        execute: () => ({ ok: true }),
      })
    );
    const r = await runSkill("off", {});
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/disabled/);
  });
});

describe("Prompt Registry", () => {
  it("findPromptBySlot filtra por match", () => {
    aiExtensionRegistry.registerAll([
      definePrompt({
        id: "p1",
        pluginId: "p",
        slot: "copilot.demo",
        version: "1",
        systemPrompt: "one",
        match: (ctx) => ctx.module === "solicitacoes",
        priority: 10,
      }),
      definePrompt({
        id: "p2",
        pluginId: "p",
        slot: "copilot.demo",
        version: "1",
        systemPrompt: "two",
        priority: 100,
      }),
    ]);
    expect(findPromptBySlot("copilot.demo", { module: "solicitacoes" })?.id).toBe("p1");
    expect(findPromptBySlot("copilot.demo", { module: "other" })?.id).toBe("p2");
  });

  it("renderUserTemplate substitui variáveis", () => {
    const p = definePrompt({
      id: "t",
      pluginId: "p",
      slot: "s",
      version: "1",
      systemPrompt: "",
      userTemplate: "olá {{nome}}",
    });
    expect(renderUserTemplate(p, { nome: "Ana" })).toBe("olá Ana");
  });
});

describe("Tool SDK", () => {
  it("runTool ok", async () => {
    aiExtensionRegistry.register(
      defineTool({
        id: "t",
        pluginId: "p",
        description: "d",
        execute: (i: number) => ({ ok: true, output: i * 2 }),
      })
    );
    const r = await runTool<number, number>("t", 3);
    expect(r.output).toBe(6);
  });
});

describe("Context Builder", () => {
  it("buildContext combina saídas", async () => {
    aiExtensionRegistry.registerAll([
      defineContextBuilder({
        id: "a",
        pluginId: "p",
        scope: "demand",
        build: () => ({ a: 1 }),
      }),
      defineContextBuilder({
        id: "b",
        pluginId: "p",
        scope: "demand",
        build: () => ({ b: 2 }),
      }),
    ]);
    const out = await buildContext("demand");
    expect(out).toEqual({ a: 1, b: 2 });
  });
});

describe("Agent SDK", () => {
  it("runAgent executa", async () => {
    aiExtensionRegistry.register(
      defineAgent({
        id: "a",
        pluginId: "p",
        name: "A",
        execute: (input) => ({ ok: true, output: input.length }),
      })
    );
    const r = await runAgent("a", "hi");
    expect(r.output).toBe(2);
  });
});

describe("Memory Provider", () => {
  it("in-memory append/list/clear", () => {
    const m = createInMemoryProvider("session", "p", "mem");
    m.append("k", { role: "user", content: "oi", createdAt: 1 });
    expect(m.list("k")).toHaveLength(1);
    m.clear("k");
    expect(m.list("k")).toHaveLength(0);
  });

  it("readOnly ignora writes", () => {
    const m = createInMemoryProvider("readonly", "p", "ro", { readOnly: true });
    m.append("k", { role: "user", content: "x", createdAt: 1 });
    expect(m.list("k")).toHaveLength(0);
  });
});

describe("Router", () => {
  it("prioriza routers customizados", () => {
    aiExtensionRegistry.registerAll([
      definePrompt({
        id: "p-mod",
        pluginId: "p",
        slot: "copilot.solicitacoes",
        version: "1",
        systemPrompt: "s",
      }),
      {
        kind: "router",
        id: "custom",
        pluginId: "p",
        priority: 1,
        resolve: () => ({
          prompt: definePrompt({
            id: "p-custom",
            pluginId: "p",
            slot: "custom",
            version: "1",
            systemPrompt: "c",
          }),
        }),
      },
    ]);
    const r = resolveAi({ module: "solicitacoes" });
    expect(r?.prompt.id).toBe("p-custom");
  });

  it("fallback por slot inferido do módulo", () => {
    aiExtensionRegistry.register(
      definePrompt({
        id: "p-mod",
        pluginId: "p",
        slot: "copilot.solicitacoes",
        version: "1",
        systemPrompt: "s",
      })
    );
    const r = resolveAi({ module: "solicitacoes" });
    expect(r?.prompt.id).toBe("p-mod");
  });

  it("null quando nada registrado", () => {
    expect(resolveAi({ module: "x" })).toBeNull();
  });
});

describe("Diagnostics", () => {
  it("coleta health e versões", () => {
    aiExtensionRegistry.registerAll([
      defineSkill({
        id: "h",
        pluginId: "p",
        title: "H",
        version: "1.2.3",
        execute: () => ({ ok: true }),
        health: () => "ok",
      }),
      defineSkill({
        id: "d",
        pluginId: "p",
        title: "D",
        execute: () => ({ ok: true }),
        health: () => "down",
      }),
    ]);
    const d = collectAiSdkDiagnostics();
    expect(d.registry.total).toBe(2);
    expect(d.health.some((h) => h.health === "ok")).toBe(true);
    expect(d.health.some((h) => h.health === "down")).toBe(true);
    expect(d.versions["skill:h"]).toBe("1.2.3");
  });
});

describe("Service Mesh", () => {
  it("bootstrap publica service.ai-sdk", () => {
    bootstrapAiSdkProvider();
    const found = serviceRegistry
      .list()
      .find((p) => (p.contract as unknown as string) === AI_SDK_CONTRACT);
    expect(found?.id).toBe("platform.core.ai-sdk");
  });
});

describe("Plugin exemplo", () => {
  it("activate registra 3 skills + 4 prompts + 2 tools + 2 ctx + 1 mem + 1 router + 2 agents", () => {
    (AiSkillsPlugin.activate as any)?.({});
    const d = aiExtensionRegistry.diagnostics();
    expect(d.byKind.skill).toBe(3);
    expect(d.byKind.prompt).toBe(4);
    expect(d.byKind.tool).toBe(2);
    expect(d.byKind["context-builder"]).toBe(2);
    expect(d.byKind["memory-provider"]).toBe(1);
    expect(d.byKind.router).toBe(1);
    expect(d.byKind.agent).toBe(2);
    (AiSkillsPlugin.deactivate as any)?.({});
    expect(aiExtensionRegistry.diagnostics().total).toBe(0);
  });

  it("triage-agent orquestra skills registradas", async () => {
    (AiSkillsPlugin.activate as any)?.({});
    const r = await aiSdkService.runAgent("triage-agent", "urgent problem here");
    expect(r.ok).toBe(true);
    expect((r.output as { priority: string }).priority).toBe("P0");
    (AiSkillsPlugin.deactivate as any)?.({});
  });

  it("router do plugin resolve prompt para /portal", () => {
    (AiSkillsPlugin.activate as any)?.({});
    const r = aiSdkService.resolve({ route: "/portal" });
    expect(r?.prompt.slot).toBe("copilot.portal");
    (AiSkillsPlugin.deactivate as any)?.({});
  });
});
