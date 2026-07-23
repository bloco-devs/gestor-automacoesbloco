/**
 * PLUGIN 008 — AI Orchestrator SDK.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  aiExtensionRegistry,
  aiSdkService,
  defineAgent,
  defineSkill,
  defineTool,
} from "../ai-sdk";
import {
  AI_ORCHESTRATOR_CONTRACT,
  __resetAiOrchestratorBootstrap,
  __resetChains,
  aiOrchestratorService,
  bootstrapAiOrchestratorProvider,
  DEFAULT_POLICIES,
  defineSelector,
  definePlanner,
  definePipeline,
  definePolicy,
  orchestrate,
  orchestratorRegistry,
  planExecution,
  resolvePolicy,
  buildDefaultPlan,
  collectOrchestratorDiagnostics,
} from "../orchestrator";
import { serviceRegistry } from "../services/registry/registry";
import MultiAgentPlugin from "@/plugins/multi-agent";

const PID = "test.orch";

function reset() {
  aiExtensionRegistry.__reset();
  orchestratorRegistry.__reset();
  __resetAiOrchestratorBootstrap();
  __resetChains();
}

beforeEach(reset);

describe("Policies", () => {
  it("expõe presets padrão", () => {
    expect(DEFAULT_POLICIES.map((p) => p.id)).toEqual([
      "fast",
      "balanced",
      "quality",
      "developer",
      "economy",
    ]);
  });
  it("resolvePolicy usa balanced como fallback", () => {
    expect(resolvePolicy(undefined, []).id).toBe("balanced");
    expect(resolvePolicy("quality", []).id).toBe("quality");
  });
  it("registro adicional funciona", () => {
    orchestratorRegistry.register(definePolicy({ id: "custom", pluginId: PID }));
    expect(resolvePolicy("custom", orchestratorRegistry.policies()).id).toBe("custom");
  });
});

describe("Planner", () => {
  it("monta plano com agent + skills + tools", () => {
    aiSdkService.registerAll([
      defineAgent({ id: "a1", pluginId: PID, name: "A1", routingPolicy: { modules: ["solicitacoes"] }, toolIds: ["t1"], execute: () => ({ ok: true }) }),
      defineSkill({ id: "s1", pluginId: PID, title: "S1", execute: () => ({ ok: true }) }),
      defineTool({ id: "t1", pluginId: PID, description: "T1", execute: () => ({ ok: true }) }),
    ]);
    const plan = buildDefaultPlan({
      ctx: { module: "solicitacoes" },
      policy: resolvePolicy("balanced", []),
    });
    expect(plan.agent?.id).toBe("a1");
    expect(plan.skills.map((s) => s.id)).toContain("s1");
    expect(plan.tools.map((t) => t.id)).toContain("t1");
    expect(plan.pipeline.length).toBeGreaterThan(0);
    expect(plan.confidence).toBeGreaterThan(0);
  });

  it("planner custom sobrepõe default", () => {
    orchestratorRegistry.register(
      definePlanner({
        id: "custom",
        pluginId: PID,
        priority: 1,
        plan: (pctx) => ({
          id: "custom_plan",
          createdAt: Date.now(),
          policy: pctx.policy.id,
          skills: [],
          tools: [],
          pipeline: [{ id: "x", kind: "output" }],
          priority: 1,
          estimatedCost: 0,
          confidence: 1,
          reason: "custom",
        }),
      })
    );
    const plan = planExecution({ module: "x" });
    expect(plan.id).toBe("custom_plan");
  });
});

describe("Selectors", () => {
  it("selector custom escolhe agente específico", () => {
    aiSdkService.registerAll([
      defineAgent({ id: "a1", pluginId: PID, name: "A1", execute: () => ({ ok: true }) }),
      defineAgent({ id: "a2", pluginId: PID, name: "A2", execute: () => ({ ok: true }) }),
    ]);
    orchestratorRegistry.register(
      defineSelector({
        id: "pick-a2",
        pluginId: PID,
        priority: 1,
        selectAgent: (_c, _p, agents) => agents.find((a) => a.id === "a2"),
      })
    );
    const plan = planExecution({});
    expect(plan.agent?.id).toBe("a2");
  });
});

describe("Pipeline override", () => {
  it("pipeline custom substitui steps padrão", () => {
    orchestratorRegistry.register(
      definePipeline({
        id: "override",
        pluginId: PID,
        priority: 1,
        match: (ctx) => ctx.module === "portal",
        steps: [{ id: "only", kind: "output" }],
      })
    );
    const plan = planExecution({ module: "portal" });
    expect(plan.pipeline).toHaveLength(1);
    expect(plan.reason).toContain("override");
  });
});

describe("Scheduler / orchestrate", () => {
  it("executa skill via orchestrate", async () => {
    aiSdkService.register(
      defineSkill({ id: "s.ok", pluginId: PID, title: "S", execute: () => ({ ok: true, output: 7 }) })
    );
    const r = await orchestrate({ module: "generic" }, { policy: "balanced" });
    expect(r.ok).toBe(true);
    expect(r.chain.status).toBe("ok");
    expect(r.chain.steps.length).toBeGreaterThan(0);
  });

  it("dryRun não executa steps", async () => {
    aiSdkService.register(
      defineSkill({ id: "s.ok", pluginId: PID, title: "S", execute: () => ({ ok: true }) })
    );
    const r = await orchestrate({}, { dryRun: true });
    expect(r.chain.steps).toEqual([]);
    expect(r.plan.pipeline.length).toBeGreaterThan(0);
  });

  it("cancelamento via AbortSignal", async () => {
    aiSdkService.register(
      defineSkill({ id: "s.slow", pluginId: PID, title: "slow", execute: () => new Promise((r) => setTimeout(() => r({ ok: true }), 30)) })
    );
    const ac = new AbortController();
    ac.abort();
    const r = await orchestrate({}, { signal: ac.signal });
    expect(r.chain.status).toBe("cancelled");
  });

  it("timeout lógico marca erro", async () => {
    aiSdkService.register(
      defineSkill({ id: "s.slow", pluginId: PID, title: "slow", execute: () => new Promise((r) => setTimeout(() => r({ ok: true }), 50)) })
    );
    const r = await orchestrate({}, { timeoutMs: 1 });
    const errStep = r.chain.steps.find((s) => s.status === "error");
    expect(errStep?.error).toMatch(/timeout/);
  });
});

describe("Diagnostics + Chains", () => {
  it("coleta métricas após execução", async () => {
    aiSdkService.register(
      defineSkill({ id: "s.ok", pluginId: PID, title: "S", execute: () => ({ ok: true }) })
    );
    await orchestrate({});
    const d = collectOrchestratorDiagnostics();
    expect(d.recentPlans).toBeGreaterThan(0);
    expect(d.recentChains).toBeGreaterThan(0);
    expect(d.successRate).toBeGreaterThan(0);
  });
});

describe("Service Mesh", () => {
  it("bootstrap publica service.ai-orchestrator", () => {
    bootstrapAiOrchestratorProvider();
    const found = serviceRegistry
      .list()
      .find((r) => (r.contract as unknown as string) === AI_ORCHESTRATOR_CONTRACT);
    expect(found?.id).toBe("platform.core.ai-orchestrator");
  });
});

describe("Multi-Agent example plugin", () => {
  it("activate registra extensões (agents/skills/tools + orchestrator exts)", () => {
    (MultiAgentPlugin.activate as (c: unknown) => void)?.({});
    const ai = aiExtensionRegistry.diagnostics();
    expect(ai.byKind.agent).toBeGreaterThanOrEqual(4);
    expect(ai.byKind.skill).toBeGreaterThanOrEqual(6);
    expect(ai.byKind.tool).toBeGreaterThanOrEqual(4);
    expect(orchestratorRegistry.pipelines()).toHaveLength(3);
    expect(orchestratorRegistry.policies()).toHaveLength(3);
    expect(orchestratorRegistry.planners()).toHaveLength(2);
    expect(orchestratorRegistry.selectors()).toHaveLength(2);
    (MultiAgentPlugin.deactivate as (c: unknown) => void)?.({});
    expect(orchestratorRegistry.listAll()).toHaveLength(0);
  });

  it("orchestrate solicitações → ma.triage-pipeline", async () => {
    (MultiAgentPlugin.activate as (c: unknown) => void)?.({});
    const r = await aiOrchestratorService.orchestrate({ module: "solicitacoes" }, { input: "urgent bug" });
    expect(r.ok).toBe(true);
    expect(r.plan.reason).toMatch(/ma\.triage-pipeline/);
    (MultiAgentPlugin.deactivate as (c: unknown) => void)?.({});
  });
});
