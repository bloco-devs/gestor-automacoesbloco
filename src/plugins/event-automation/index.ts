/**
 * Event Automation Plugin — exemplo demonstrativo do Event SDK.
 * Registra: 2 publishers · 3 subscribers · 2 middlewares · 1 interceptor · 1 pipeline.
 * 100% aditivo, sem tocar em nenhum módulo do Core.
 */
import { definePlugin } from "@/platform-sdk";
import {
  bootstrapEventSdkProvider,
  definePipeline,
  eventSdkService,
  type EventExtension,
} from "@/platform-sdk/event-sdk";

const PLUGIN_ID = "event-automation.example";

const extensions: EventExtension[] = [
  // ── Publishers
  {
    kind: "publisher",
    id: "demand.created",
    pluginId: PLUGIN_ID,
    event: "demand.created",
    description: "Emitido quando uma nova demanda é criada.",
    validate: (p: any) => (p && typeof p.id === "string") || "payload.id ausente",
    health: () => "ok",
  },
  {
    kind: "publisher",
    id: "demand.status.changed",
    pluginId: PLUGIN_ID,
    event: "demand.status.changed",
    description: "Emitido em transições de status de demanda.",
    health: () => "ok",
  },

  // ── Subscribers
  {
    kind: "subscriber",
    id: "log-created",
    pluginId: PLUGIN_ID,
    event: "demand.created",
    priority: 10,
    description: "Loga criações de demanda.",
    handler: () => {
      /* demo */
    },
  },
  {
    kind: "subscriber",
    id: "notify-created",
    pluginId: PLUGIN_ID,
    event: "demand.created",
    priority: 50,
    description: "Dispara notificação (mock).",
    handler: async () => {
      /* demo */
    },
  },
  {
    kind: "subscriber",
    id: "audit-status",
    pluginId: PLUGIN_ID,
    event: "demand.status.changed",
    priority: 10,
    description: "Auditoria de transições.",
    handler: () => {
      /* demo */
    },
  },

  // ── Middlewares
  {
    kind: "middleware",
    id: "stamp-source",
    pluginId: PLUGIN_ID,
    phase: "beforePublish",
    priority: 10,
    description: "Adiciona metadata.source ao envelope.",
    run: async (ctx, next) => {
      ctx.rewrite({ metadata: { source: ctx.env.metadata.source ?? "system" } });
      await next();
    },
  } as EventExtension,
  {
    kind: "middleware",
    id: "measure-duration",
    pluginId: PLUGIN_ID,
    phase: ["beforeDispatch", "afterDispatch"],
    priority: 20,
    description: "Mede duração de dispatch.",
    run: async (ctx, next) => {
      if (ctx.phase === "beforeDispatch") {
        ctx.metrics.startedAt = Date.now();
      } else {
        ctx.metrics.elapsedMs = Date.now() - (ctx.metrics.startedAt ?? Date.now());
      }
      await next();
    },
  } as EventExtension,

  // ── Interceptor
  {
    kind: "interceptor",
    id: "reject-empty-id",
    pluginId: PLUGIN_ID,
    event: "demand.created",
    priority: 5,
    intercept: (env) => {
      const p = env.payload as { id?: string } | null;
      if (!p || !p.id) return { type: "cancel", reason: "payload.id ausente" };
      return { type: "continue" };
    },
  },

  // ── Pipeline
  definePipeline({
    id: "demand-created-pipeline",
    pluginId: PLUGIN_ID,
    event: "demand.created",
    description: "Pipeline canônica para criação de demandas.",
    steps: [
      "beforePublish",
      "beforeDispatch",
      "beforeSubscriber",
      "afterSubscriber",
      "afterDispatch",
      "afterPublish",
    ],
  }),
];

let disposer: (() => void) | null = null;

export default definePlugin({
  id: PLUGIN_ID,
  name: "Event Automation (Example)",
  version: "1.0.0",
  category: "workspace",
  description:
    "Plugin demonstrativo do Event Automation SDK: publishers, subscribers, middlewares, interceptor e pipeline.",
  activate: (_ctx) => {
    bootstrapEventSdkProvider();
    disposer = eventSdkService.registerAll(extensions);
  },
  deactivate: () => {
    disposer?.();
    disposer = null;
    eventSdkService.removePlugin(PLUGIN_ID);
  },
});
