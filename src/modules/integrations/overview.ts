import {
  collectObservabilityOverview,
  collectMeshTimeline,
  collectPluginMonitor,
  collectAiRuntime,
  collectWorkflowRuntime,
} from "@/modules/observability";
import { collectRuntimeHealth } from "@/modules/platform-health";
import { getEdgeFunctionCatalog } from "./edgeFunctions";
import { getConnectorCatalog } from "./connectorCatalog";
import { getWebhookTelemetry } from "./webhookTelemetry";

export interface IntegrationOverview {
  apis: number;
  edgeFunctions: number;
  webhooks: { total: number; healthy: number; failed: number };
  connectors: { total: number; active: number };
  meshContracts: number;
  meshProviders: number;
  plugins: number;
  pluginsError: number;
  aiSkills: number;
  workflowExtensions: number;
  runtimesGreen: number;
  runtimes: number;
}

function safe<T>(fn: () => T, fb: T): T {
  try { return fn(); } catch { return fb; }
}

export function getIntegrationOverview(): IntegrationOverview {
  const obs = safe(collectObservabilityOverview, {
    runtimes: 0, runtimesGreen: 0, services: 0, plugins: 0, pluginsError: 0,
    aiSkills: 0, aiAgents: 0, workflowExtensions: 0, eventListeners: 0,
    meshEvents: 0, errors: 0, criticalErrors: 0, traces: 0, securityScore: 0,
  });
  const mesh = safe(collectMeshTimeline, []);
  const ai = safe(collectAiRuntime, { skills: 0 } as ReturnType<typeof collectAiRuntime>);
  const wf = safe(collectWorkflowRuntime, { total: 0 } as ReturnType<typeof collectWorkflowRuntime>);
  const plugins = safe(collectPluginMonitor, []);
  const edge = getEdgeFunctionCatalog();
  const connectors = getConnectorCatalog();
  const webhooks = getWebhookTelemetry();
  const runtimes = safe(collectRuntimeHealth, []);

  return {
    apis: edge.length,
    edgeFunctions: edge.length,
    webhooks: {
      total: webhooks.length,
      healthy: webhooks.filter((w) => w.status === "healthy").length,
      failed: webhooks.filter((w) => w.status === "failed").length,
    },
    connectors: {
      total: connectors.length,
      active: connectors.filter((c) => c.status === "active").length,
    },
    meshContracts: mesh.length,
    meshProviders: mesh.reduce((s, r) => s + r.providers, 0),
    plugins: plugins.length,
    pluginsError: plugins.filter((p) => p.status === "error" || p.status === "rejected").length,
    aiSkills: ai.skills,
    workflowExtensions: wf.total,
    runtimes: runtimes.length,
    runtimesGreen: runtimes.filter((r) => r.status === "green").length,
    ...(obs.errors !== undefined ? {} : {}),
  };
}
