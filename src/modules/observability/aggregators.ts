/**
 * FEATURE 026 — Aggregators (Ondas 1, 3–7).
 * Read-only. Deriva estado dos runtimes existentes sem alterá-los.
 */
import { serviceMesh } from "@/platform-sdk/services/mesh/mesh";
import { meshEventHistory } from "@/platform-sdk/services/diagnostics";
import { pluginHost, type HostPluginRecord } from "@/platform-sdk/runtime";
import { collectWorkflowSdkDiagnostics } from "@/platform-sdk/workflow-sdk";
import {
  collectOrchestratorDiagnostics,
  listPlans,
  listChains,
} from "@/platform-sdk/orchestrator";
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

function countByKind(byKind: Record<string, number> | undefined, kind: string): number {
  return byKind?.[kind] ?? 0;
}

export function collectObservabilityOverview(): ObservabilityOverview {
  const health = safe(collectRuntimeHealth, []);
  const services = safe(() => serviceMesh.registry.list().length, 0);
  const pluginDiag = safe(() => pluginHost.diagnostics(), null);
  const pluginRecords: HostPluginRecord[] = pluginDiag?.plugins ?? [];
  const pluginsError = pluginRecords.filter((p) => p.status === "error" || p.status === "rejected").length;
  const ai = safe(() => collectAiSdkDiagnostics(), null);
  const wf = safe(() => collectWorkflowSdkDiagnostics(), null);
  const ev = safe(() => collectEventSdkDiagnostics(), null);
  const errs = safe(() => errorHistory(), []);
  const critical = errs.filter((e) => e.severity === "critical" || e.severity === "error").length;
  const sec = safe(() => computeSecurityScore(), null);

  return {
    runtimes: health.length,
    runtimesGreen: health.filter((h) => h.status === "green").length,
    services,
    plugins: pluginRecords.length,
    pluginsError,
    aiSkills: countByKind(ai?.registry.byKind, "skill"),
    aiAgents: countByKind(ai?.registry.byKind, "agent"),
    workflowExtensions: wf?.total ?? 0,
    eventListeners:
      countByKind(ev?.registry.byKind, "subscriber") + countByKind(ev?.registry.byKind, "interceptor"),
    meshEvents: safe(() => meshEventHistory().length, 0),
    errors: errs.length,
    criticalErrors: critical,
    traces: spanHistory().length,
    securityScore: sec?.overall ?? 0,
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
  const list = safe(() => serviceMesh.registry.list(), []);
  const byContract = new Map<string, MeshServiceRow>();
  for (const svc of list) {
    const row: MeshServiceRow = byContract.get(svc.contract) ?? {
      contract: String(svc.contract),
      providers: 0,
      version: svc.version,
      health: svc.health?.status,
      lastEvent: svc.registeredAt,
    };
    row.providers += 1;
    if (svc.registeredAt && (!row.lastEvent || svc.registeredAt > row.lastEvent)) {
      row.lastEvent = svc.registeredAt;
    }
    byContract.set(String(svc.contract), row);
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
  routes: number;
  initMs?: number;
  error?: string;
}

export function collectPluginMonitor(): PluginRow[] {
  const diag = safe(() => pluginHost.diagnostics(), null);
  const items: HostPluginRecord[] = diag?.plugins ?? [];
  return items.map((p) => ({
    id: p.id,
    status: p.status,
    version: p.version,
    commands: p.commands?.length ?? 0,
    widgets: p.widgets?.length ?? 0,
    routes: p.routes?.length ?? 0,
    initMs: p.initMs,
    error: p.error,
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
  successRate: number;
  avgDurationMs: number;
}

export function collectAiRuntime(): AiRuntimeSummary {
  const ai = safe(() => collectAiSdkDiagnostics(), null);
  const orch = safe(() => collectOrchestratorDiagnostics(), null);
  return {
    planners: orch?.extensions.planners ?? 0,
    selectors: orch?.extensions.selectors ?? 0,
    policies: orch?.extensions.policies ?? 0,
    pipelines: orch?.extensions.pipelines ?? 0,
    agents: countByKind(ai?.registry.byKind, "agent"),
    skills: countByKind(ai?.registry.byKind, "skill"),
    tools: countByKind(ai?.registry.byKind, "tool"),
    prompts: countByKind(ai?.registry.byKind, "prompt"),
    plans: safe(() => listPlans().length, 0),
    chains: safe(() => listChains().length, 0),
    successRate: orch?.successRate ?? 0,
    avgDurationMs: orch?.avgDurationMs ?? 0,
  };
}

export interface WorkflowRuntimeSummary {
  triggers: number;
  conditions: number;
  actions: number;
  validators: number;
  transformers: number;
  hooks: number;
  total: number;
}

export function collectWorkflowRuntime(): WorkflowRuntimeSummary {
  const wf = safe(() => collectWorkflowSdkDiagnostics(), null);
  return {
    triggers: countByKind(wf?.byKind, "trigger"),
    conditions: countByKind(wf?.byKind, "condition"),
    actions: countByKind(wf?.byKind, "action"),
    validators: countByKind(wf?.byKind, "validator"),
    transformers: countByKind(wf?.byKind, "transformer"),
    hooks: countByKind(wf?.byKind, "hook"),
    total: wf?.total ?? 0,
  };
}

export interface PerformanceProfile {
  label: string;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
}

export function collectPerformanceProfile(): PerformanceProfile[] {
  return safe(() => collectPerformance() as unknown as PerformanceProfile[], []);
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
