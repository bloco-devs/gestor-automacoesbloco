/**
 * AI Skills Plugin — exemplo demonstrativo do AI SDK.
 * Registra: 3 skills · 2 agents · 4 prompts · 2 tools · 2 context builders ·
 *           1 memory provider · 1 router. 100% via SDK.
 */
import { definePlugin } from "@/platform-sdk";
import {
  bootstrapAiSdkProvider,
  aiSdkService,
  defineSkill,
  definePrompt,
  defineTool,
  defineContextBuilder,
  defineAgent,
  createInMemoryProvider,
  type AiExtension,
} from "@/platform-sdk/ai-sdk";

const PLUGIN_ID = "ai-skills.example";

const extensions: AiExtension[] = [
  // ── Skills
  defineSkill({
    id: "summarize-demand",
    pluginId: PLUGIN_ID,
    title: "Resumir demanda",
    description: "Produz resumo executivo de uma demanda a partir do contexto atual.",
    category: "demand",
    capabilities: ["summarize", "explain"],
    contextRequirements: ["entity", "module"],
    version: "1.0.0",
    enabled: true,
    execute: async (input: { text?: string }) => ({
      ok: true,
      output: {
        summary: `Resumo (mock) de ${input?.text?.length ?? 0} caracteres.`,
      },
    }),
    health: () => "ok",
  }),
  defineSkill({
    id: "classify-priority",
    pluginId: PLUGIN_ID,
    title: "Classificar prioridade",
    description: "Sugere prioridade P0..P3 a partir do texto.",
    category: "triage",
    capabilities: ["classify"],
    version: "1.0.0",
    execute: async (input: { text?: string }) => {
      const t = (input?.text ?? "").toLowerCase();
      const priority = t.includes("urgent") || t.includes("crítico") ? "P0" : "P2";
      return { ok: true, output: { priority } };
    },
    health: () => "ok",
  }),
  defineSkill({
    id: "explain-panel",
    pluginId: PLUGIN_ID,
    title: "Explicar painel",
    description: "Gera narrativa sobre um painel/analytics.",
    category: "analytics",
    capabilities: ["explain"],
    version: "1.0.0",
    execute: async () => ({ ok: true, output: { narrative: "Painel estável (mock)." } }),
  }),

  // ── Prompts
  definePrompt({
    id: "prompt.demand.route",
    pluginId: PLUGIN_ID,
    slot: "copilot.solicitacoes",
    version: "1.0.0",
    author: PLUGIN_ID,
    description: "Prompt de contexto para demandas.",
    temperature: 0.3,
    maxTokens: 800,
    systemPrompt:
      "Você é um copiloto de operações. Ajude o usuário com demandas de forma objetiva.",
    userTemplate: "Contexto: {{context}}\nPergunta: {{question}}",
    variables: [
      { name: "context", required: true },
      { name: "question", required: true },
    ],
  }),
  definePrompt({
    id: "prompt.portal.suggest",
    pluginId: PLUGIN_ID,
    slot: "copilot.portal",
    version: "1.0.0",
    author: PLUGIN_ID,
    systemPrompt:
      "Você é um assistente do portal. Sugira soluções antes de abrir chamado.",
    temperature: 0.2,
  }),
  definePrompt({
    id: "prompt.analytics.explain",
    pluginId: PLUGIN_ID,
    slot: "copilot.analytics",
    version: "1.0.0",
    systemPrompt: "Você explica gráficos e aponta anomalias com sobriedade.",
  }),
  definePrompt({
    id: "prompt.generic.fallback",
    pluginId: PLUGIN_ID,
    slot: "copilot.fallback",
    version: "1.0.0",
    systemPrompt: "Você é um copiloto genérico. Responda com clareza e precisão.",
    priority: 999,
  }),

  // ── Tools
  defineTool({
    id: "count-words",
    pluginId: PLUGIN_ID,
    description: "Conta palavras em um texto.",
    inputSchema: { type: "object", properties: { text: { type: "string" } } },
    outputSchema: { type: "object", properties: { count: { type: "number" } } },
    execute: (input: { text?: string }) => ({
      ok: true,
      output: { count: (input?.text ?? "").trim().split(/\s+/).filter(Boolean).length },
    }),
    health: () => "ok",
  }),
  defineTool({
    id: "detect-lang",
    pluginId: PLUGIN_ID,
    description: "Detecta idioma (mock).",
    execute: (input: { text?: string }) => {
      const t = input?.text ?? "";
      return {
        ok: true,
        output: { lang: /[ãõçáéíóú]/i.test(t) ? "pt" : "en" },
      };
    },
    health: () => "ok",
  }),

  // ── Context Builders
  defineContextBuilder({
    id: "demand-ctx",
    pluginId: PLUGIN_ID,
    scope: "demand",
    description: "Compõe contexto de demanda a partir do invocation.",
    build: (ctx) => ({
      entityId: ctx.entityId,
      module: ctx.module,
      route: ctx.route,
    }),
  }),
  defineContextBuilder({
    id: "portal-ctx",
    pluginId: PLUGIN_ID,
    scope: "portal",
    build: (ctx) => ({ portal: true, route: ctx.route }),
  }),

  // ── Memory
  createInMemoryProvider("session", PLUGIN_ID, "session-mem"),

  // ── Router
  {
    kind: "router",
    id: "example-router",
    pluginId: PLUGIN_ID,
    description: "Roteador de exemplo: portal → portal.suggest.",
    priority: 50,
    resolve: (ctx) => {
      if (ctx.route?.startsWith("/portal")) {
        const prompt = aiSdkService.findPrompt("copilot.portal");
        return prompt ? { prompt, reason: "route:/portal" } : null;
      }
      return null;
    },
  },

  // ── Agents
  defineAgent({
    id: "triage-agent",
    pluginId: PLUGIN_ID,
    name: "Triage Agent",
    description: "Agente que triage demandas em priority + summary.",
    version: "1.0.0",
    promptSlot: "copilot.solicitacoes",
    toolIds: ["count-words", "detect-lang"],
    contextScopes: ["demand"],
    memoryId: "session-mem",
    routingPolicy: { modules: ["solicitacoes", "kanban"], priority: 10 },
    plan: (input) => [`analyze:${input.length}`, "classify", "summarize"],
    execute: async (input) => {
      const pr = await aiSdkService.runSkill("classify-priority", { text: input });
      const sm = await aiSdkService.runSkill("summarize-demand", { text: input });
      return {
        ok: true,
        output: {
          priority: (pr.output as { priority: string })?.priority,
          summary: (sm.output as { summary: string })?.summary,
        },
      };
    },
    health: () => "ok",
  }),
  defineAgent({
    id: "explain-agent",
    pluginId: PLUGIN_ID,
    name: "Explain Agent",
    description: "Explica painéis e resultados analíticos.",
    version: "1.0.0",
    promptSlot: "copilot.analytics",
    routingPolicy: { modules: ["analytics"], priority: 20 },
    execute: async () =>
      aiSdkService.runSkill("explain-panel", {}),
    health: () => "ok",
  }),
];

let disposer: (() => void) | null = null;

export default definePlugin({
  id: PLUGIN_ID,
  name: "AI Skills (Example)",
  version: "1.0.0",
  category: "workspace",
  description:
    "Plugin demonstrativo do AI SDK: skills, agents, prompts, tools, context, memory e router — 100% via SDK.",
  activate: (_ctx) => {
    bootstrapAiSdkProvider();
    disposer = aiSdkService.registerAll(extensions);
  },
  deactivate: () => {
    disposer?.();
    disposer = null;
    aiSdkService.removePlugin(PLUGIN_ID);
  },
});
