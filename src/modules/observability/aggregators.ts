/**
 * FEATURE 026 — Aggregators (Ondas 1, 3–7).
 * Read-only. Deriva estado dos runtimes existentes sem alterá-los.
 */
import { serviceMesh } from "@/platform-sdk/services/mesh/mesh";
import { meshEventHistory } from "@/platform-sdk/services/diagnostics";
import { pluginHost } from "@/platform-sdk/runtime";
import { collectWorkflowSdkDiagnostics } from "@/platform-sdk/workflow-sdk";
import { collectOrchestratorDiagnostics, listPlans, listChains } from "@/platform-sdk/orchestrator";
import { collectAiSdkDiagnostics } from "@/platform-sdk/ai-sdk";
import { collectEventSdkDiagnostics } from "@/platform-sdk/event-sdk";
import { collectRuntimeHealth, collectPerformance } from "@/modules/platform-health";
import { errorHistory } from "@/modules/errors";
import { auditHistory } from "@/modules/audit";
import { computeSecurityScore } from "@/modules/security";
import { spanHistory } from "./tracing";

export interface ObservabilityOverview {
  runtimes: number;
  runtimesGreen: number;
  services: number;
  plugins: number;
  pluginsError: number;
  aiSkills: number;
  aiAgents: number;
  workflowExtensions: number;
  eventListeners: number;
  meshEvents: number;
  errors: number;
  criticalErrors: number;
  traces: number;
  securityScore: number;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function collectObservabilityOverview(): ObservabilityOverview {
  const health = safe(collectRuntimeHealth, []);
  const services = safe(() => serviceMesh.registry.list().length, 0);
  const pluginDiag = safe(() => pluginHost.diagnostics(), { plugins: [] as Array<{ status: string }> });
  const plugins = pluginDiag.plugins?.length ?? 0;
  const pluginsError = pluginDiag.plugins?.filter((p) => p.status === "error").length ?? 0;
  const ai = safe(() => collectAiSdkDiagnostics(), null);
  const wf = safe(() => collectWorkflowSdkDiagnostics(), null);
  const ev = safe(() => collectEventSdkDiagnostics(), null);
  const errs = safe(() => errorHistory(), []);
  const critical = errs.filter((e) => e.severity === "critical" || e.severity === "error").length;
  const sec = safe(() => computeSecurityScore(), { score: 100 } as { score: number });

  return {
    runtimes: health.length,
    runtimesGreen: health.filter((h) => h.status === "green").length,
    services,
    plugins,
    pluginsError,
    aiSkills: ai?.registry?.skills ?? 0,
    aiAgents: ai?.registry?.agents ?? 0,
    workflowExtensions:
      (wf?.registry?.triggers ?? 0) +
      (wf?.registry?.actions ?? 0) +
      (wf?.registry?.conditions ?? 0) +
      (wf?.registry?.validators ?? 0),
    eventListeners: ev?.registry?.listeners ?? 0,
    meshEvents: safe(() => meshEventHistory().length, 0),
    errors: errs.length,
    criticalErrors: critical,
    traces: spanHistory().length,
    securityScore: sec.score ?? 0,
  };
}

export interface MeshServiceRow {
  contract: string;
  providers: number;
  version?: string;
  health?: string;
  lastEvent?: number;
}

export function collectMeshTimeline(): MeshServiceRow[] {
  const list = safe(() => serviceMesh.registry.list(), [] as Array<{
    contract: string;
    version?: string;
    health?: string;
    at?: number;
  }>);
  const byContract = new Map<string, MeshServiceRow>();
  for (const svc of list) {
    const row = byContract.get(svc.contract) ?? {
      contract: svc.contract,
      providers: 0,
      version: svc.version,
      health: svc.health,
      lastEvent: svc.at,
    };
    row.providers += 1;
    if (svc.at && (!row.lastEvent || svc.at > row.lastEvent)) row.lastEvent = svc.at;
    byContract.set(svc.contract, row);
  }
  const events = safe(() => meshEventHistory(), []);
  for (const ev of events) {
    if (!ev.contract) continue;
    const row = byContract.get(ev.contract);
    if (row && (!row.lastEvent || ev.at > row.lastEvent)) row.lastEvent = ev.at;
  }
  return Array.from(byContract.values()).sort((a, b) => a.contract.localeCompare(b.contract));
}

export interface PluginRow {
  id: string;
  status: string;
  version?: string;
  commands: number;
  widgets: number;
  sidebar: number;
  detail?: string;
}

export function collectPluginMonitor(): PluginRow[] {
  const diag = safe(() => pluginHost.diagnostics(), { plugins: [] as Array<Record<string, unknown>> });
  const items = (diag.plugins ?? []) as Array<{
    id: string;
    status: string;
    version?: string;
    commands?: unknown[];
    widgets?: unknown[];
    sidebar?: unknown[];
    detail?: string;
  }>;
  return items.map((p) => ({
    id: p.id,
    status: p.status,
    version: p.version,
    commands: p.commands?.length ?? 0,
    widgets: p.widgets?.length ?? 0,
    sidebar: p.sidebar?.length ?? 0,
    detail: p.detail,
  }));
}

export interface AiRuntimeSummary {
  planners: number;
  selectors: number;
  policies: number;
  pipelines: number;
  agents: number;
  skills: number;
  tools: number;
  prompts: number;
  plans: number;
  chains: number;
}

export function collectAiRuntime(): AiRuntimeSummary {
  const ai = safe(() => collectAiSdkDiagnostics(), null);
  const orch = safe(() => collectOrchestratorDiagnostics(), null);
  return {
    planners: orch?.registry?.planners ?? 0,
    selectors: orch?.registry?.selectors ?? 0,
    policies: orch?.registry?.policies ?? 0,
    pipelines: orch?.registry?.pipelines ?? 0,
    agents: ai?.registry?.agents ?? 0,
    skills: ai?.registry?.skills ?? 0,
    tools: ai?.registry?.tools ?? 0,
    prompts: ai?.registry?.prompts ?? 0,
    plans: safe(() => listPlans().length, 0),
    chains: safe(() => listChains().length, 0),
  };
}

export interface WorkflowRuntimeSummary {
  triggers: number;
  conditions: number;
  actions: number;
  validators: number;
  hooks: number;
}

export function collectWorkflowRuntime(): WorkflowRuntimeSummary {
  const wf = safe(() => collectWorkflowSdkDiagnostics(), null);
  return {
    triggers: wf?.registry?.triggers ?? 0,
    conditions: wf?.registry?.conditions ?? 0,
    actions: wf?.registry?.actions ?? 0,
    validators: wf?.registry?.validators ?? 0,
    hooks: wf?.registry?.hooks ?? 0,
  };
}

export interface PerformanceProfile {
  label: string;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
}

export function collectPerformanceProfile(): PerformanceProfile[] {
  return safe(() => collectPerformance() as PerformanceProfile[], []);
}

export interface AuditPulse {
  total: number;
  last24h: number;
  failures: number;
}

export function collectAuditPulse(): AuditPulse {
  const events = safe(() => auditHistory(), []);
  const now = Date.now();
  const last24h = events.filter((e) => now - e.at < 24 * 3600 * 1000).length;
  const failures = events.filter((e) => e.result === "failure").length;
  return { total: events.length, last24h, failures };
}
