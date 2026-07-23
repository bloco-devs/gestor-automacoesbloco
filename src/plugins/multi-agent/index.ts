/**
 * Multi-Agent Plugin — demonstra o AI Orchestrator SDK.
 * Registra 4 agentes, 6 skills, 4 tools, 3 pipelines, 3 policies, 2 planners e 2 selectors.
 * 100% via AI SDK + Orchestrator SDK.
 */
import { definePlugin } from "@/platform-sdk";
import {
  aiSdkService,
  bootstrapAiSdkProvider,
  defineAgent,
  defineSkill,
  defineTool,
  type AiExtension,
} from "@/platform-sdk/ai-sdk";
import {
  aiOrchestratorService,
  bootstrapAiOrchestratorProvider,
  definePipeline,
  definePlanner,
  definePolicy,
  defineSelector,
  buildDefaultPlan,
  type OrchestratorExtension,
} from "@/platform-sdk/orchestrator";

const PLUGIN_ID = "multi-agent.example";

const aiExts: AiExtension[] = [
  // Skills (6)
  defineSkill({ id: "ma.summarize", pluginId: PLUGIN_ID, title: "Summarize", capabilities: ["summarize"], execute: (i: { text?: string }) => ({ ok: true, output: { summary: `sum:${(i?.text ?? "").length}` } }), health: () => "ok" }),
  defineSkill({ id: "ma.classify", pluginId: PLUGIN_ID, title: "Classify", capabilities: ["classify"], execute: (i: { text?: string }) => ({ ok: true, output: { label: (i?.text ?? "").length > 40 ? "long" : "short" } }), health: () => "ok" }),
  defineSkill({ id: "ma.extract", pluginId: PLUGIN_ID, title: "Extract", capabilities: ["extract"], execute: () => ({ ok: true, output: { entities: [] } }), health: () => "ok" }),
  defineSkill({ id: "ma.route", pluginId: PLUGIN_ID, title: "Route", capabilities: ["route"], execute: () => ({ ok: true, output: { target: "team-x" } }), health: () => "ok" }),
  defineSkill({ id: "ma.reason", pluginId: PLUGIN_ID, title: "Reason", capabilities: ["reason"], execute: () => ({ ok: true, output: { thoughts: "…" } }), health: () => "degraded" }),
  defineSkill({ id: "ma.explain", pluginId: PLUGIN_ID, title: "Explain", capabilities: ["explain"], execute: () => ({ ok: true, output: { narrative: "ok" } }), health: () => "ok" }),

  // Tools (4)
  defineTool({ id: "ma.count-words", pluginId: PLUGIN_ID, description: "Count words", execute: (i: { text?: string }) => ({ ok: true, output: { count: (i?.text ?? "").split(/\s+/).filter(Boolean).length } }), health: () => "ok" }),
  defineTool({ id: "ma.hash", pluginId: PLUGIN_ID, description: "Hash", execute: (i: { text?: string }) => ({ ok: true, output: { hash: (i?.text ?? "").length } }), health: () => "ok" }),
  defineTool({ id: "ma.lang", pluginId: PLUGIN_ID, description: "Detect lang", execute: () => ({ ok: true, output: { lang: "pt" } }), health: () => "ok" }),
  defineTool({ id: "ma.echo", pluginId: PLUGIN_ID, description: "Echo", execute: (i: unknown) => ({ ok: true, output: i }), health: () => "ok" }),

  // Agents (4)
  defineAgent({
    id: "ma.triage",
    pluginId: PLUGIN_ID,
    name: "Triage",
    routingPolicy: { modules: ["solicitacoes", "kanban"], priority: 10 },
    toolIds: ["ma.count-words", "ma.lang"],
    execute: async (input) => {
      const c = await aiSdkService.runSkill("ma.classify", { text: input });
      return { ok: true, output: { label: (c.output as { label?: string })?.label } };
    },
    health: () => "ok",
  }),
  defineAgent({
    id: "ma.analyst",
    pluginId: PLUGIN_ID,
    name: "Analyst",
    routingPolicy: { modules: ["analytics"], priority: 20 },
    toolIds: ["ma.hash"],
    execute: async () => aiSdkService.runSkill("ma.explain", {}),
    health: () => "ok",
  }),
  defineAgent({
    id: "ma.router",
    pluginId: PLUGIN_ID,
    name: "Router",
    routingPolicy: { modules: ["operacoes"], priority: 15 },
    execute: async () => aiSdkService.runSkill("ma.route", {}),
    health: () => "ok",
  }),
  defineAgent({
    id: "ma.explainer",
    pluginId: PLUGIN_ID,
    name: "Explainer",
    routingPolicy: { modules: ["portal"], priority: 30 },
    execute: async () => aiSdkService.runSkill("ma.explain", {}),
    health: () => "ok",
  }),
];

const orchExts: OrchestratorExtension[] = [
  // Policies (3)
  definePolicy({ id: "ma.fast", pluginId: PLUGIN_ID, description: "Multi-agent fast", maxAgents: 1, maxSkills: 1, maxTools: 1, costMultiplier: 0.5, scheduling: "sequential", preferHealth: true, preferHighestPriority: true, minConfidence: 0.1 }),
  definePolicy({ id: "ma.deep", pluginId: PLUGIN_ID, description: "Multi-agent deep", maxAgents: 4, maxSkills: 6, maxTools: 4, costMultiplier: 3, scheduling: "parallel", preferHealth: false, minConfidence: 0.2 }),
  definePolicy({ id: "ma.debug", pluginId: PLUGIN_ID, description: "Debug", maxAgents: 4, maxSkills: 6, maxTools: 4, costMultiplier: 1, scheduling: "pipeline", preferHealth: false, minConfidence: 0 }),

  // Planners (2)
  definePlanner({
    id: "ma.default",
    pluginId: PLUGIN_ID,
    description: "Planner default do plugin.",
    priority: 50,
    plan: (pctx) => (pctx.ctx.module === "solicitacoes" ? buildDefaultPlan(pctx) : null),
  }),
  definePlanner({
    id: "ma.analyst-planner",
    pluginId: PLUGIN_ID,
    description: "Planner focado em analytics.",
    priority: 60,
    plan: (pctx) => (pctx.ctx.module === "analytics" ? buildDefaultPlan(pctx) : null),
  }),

  // Selectors (2)
  defineSelector({
    id: "ma.prefer-triage",
    pluginId: PLUGIN_ID,
    priority: 10,
    selectAgent: (ctx, _pol, agents) =>
      ctx.module === "solicitacoes" ? agents.find((a) => a.id === "ma.triage") : undefined,
  }),
  defineSelector({
    id: "ma.pick-skills",
    pluginId: PLUGIN_ID,
    priority: 20,
    selectSkills: (_ctx, policy, skills) => skills.filter((s) => s.pluginId === PLUGIN_ID).slice(0, policy.maxSkills ?? 3),
  }),

  // Pipelines (3)
  definePipeline({
    id: "ma.triage-pipeline",
    pluginId: PLUGIN_ID,
    priority: 10,
    match: (ctx) => ctx.module === "solicitacoes",
    steps: [
      { id: "ctx", kind: "context" },
      { id: "plan", kind: "planner" },
      { id: "agent:ma.triage", kind: "agent", refId: "ma.triage" },
      { id: "skill:ma.classify", kind: "skill", refId: "ma.classify", parallelGroup: "skills" },
      { id: "skill:ma.summarize", kind: "skill", refId: "ma.summarize", parallelGroup: "skills" },
      { id: "out", kind: "output" },
    ],
  }),
  definePipeline({
    id: "ma.analyst-pipeline",
    pluginId: PLUGIN_ID,
    priority: 10,
    match: (ctx) => ctx.module === "analytics",
    steps: [
      { id: "ctx", kind: "context" },
      { id: "agent:ma.analyst", kind: "agent", refId: "ma.analyst" },
      { id: "skill:ma.explain", kind: "skill", refId: "ma.explain" },
      { id: "out", kind: "output" },
    ],
  }),
  definePipeline({
    id: "ma.portal-pipeline",
    pluginId: PLUGIN_ID,
    priority: 10,
    match: (ctx) => ctx.route?.startsWith("/portal") ?? false,
    steps: [
      { id: "agent:ma.explainer", kind: "agent", refId: "ma.explainer" },
      { id: "out", kind: "output" },
    ],
  }),
];

let disposers: Array<() => void> = [];

export default definePlugin({
  id: PLUGIN_ID,
  name: "Multi-Agent (Example)",
  version: "1.0.0",
  category: "workspace",
  description: "Plugin demonstrativo do AI Orchestrator SDK — 4 agents, 6 skills, 4 tools, 3 pipelines, 3 policies, 2 planners, 2 selectors.",
  activate: () => {
    bootstrapAiSdkProvider();
    bootstrapAiOrchestratorProvider();
    disposers = [
      aiSdkService.registerAll(aiExts),
      aiOrchestratorService.registerAll(orchExts),
    ];
  },
  deactivate: () => {
    disposers.forEach((d) => d());
    disposers = [];
    aiSdkService.removePlugin(PLUGIN_ID);
    aiOrchestratorService.removePlugin(PLUGIN_ID);
  },
});
