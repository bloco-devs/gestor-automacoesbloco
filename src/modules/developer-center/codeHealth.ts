/**
 * Onda 11 — Code Health.
 * Derivado in-memory de diagnósticos existentes. Sem AST/análise externa.
 */
import { pluginHost } from "@/platform-sdk/runtime";
import { collectAiSdkDiagnostics } from "@/platform-sdk/ai-sdk";
import { collectWorkflowSdkDiagnostics } from "@/platform-sdk/workflow-sdk";
import { collectEventSdkDiagnostics } from "@/platform-sdk/event-sdk";
import { serviceMesh } from "@/platform-sdk/services/mesh/mesh";

export interface CodeHealthReport {
  plugins: { total: number; ok: number; error: number };
  services: number;
  sdkUsage: {
    ai: number;
    workflow: number;
    event: number;
  };
  experimental: string[];
  deprecated: string[];
  featureFlags: number;
  notes: string[];
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function collectCodeHealth(): CodeHealthReport {
  const diag = safe(() => pluginHost.diagnostics(), null);
  const plugins = diag?.plugins ?? [];
  const ok = plugins.filter((p) => p.status === "active" || p.status === "registered").length;
  const err = plugins.filter((p) => p.status === "error" || p.status === "rejected").length;
  const ai = safe(() => collectAiSdkDiagnostics(), null);
  const wf = safe(() => collectWorkflowSdkDiagnostics(), null);
  const ev = safe(() => collectEventSdkDiagnostics(), null);

  let flags = 0;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("feature-flags") : null;
    if (raw) flags = Object.keys(JSON.parse(raw)).length;
  } catch {
    /* noop */
  }

  return {
    plugins: { total: plugins.length, ok, error: err },
    services: safe(() => serviceMesh.registry.list().length, 0),
    sdkUsage: {
      ai: ai?.registry.total ?? 0,
      workflow: wf?.total ?? 0,
      event: ev?.registry.total ?? 0,
    },
    experimental: plugins.filter((p) => p.version?.includes("beta") || p.version?.includes("alpha")).map((p) => p.id),
    deprecated: [],
    featureFlags: flags,
    notes: [
      "Análise baseada em diagnósticos in-memory. Não substitui lint/typecheck/coverage.",
      "Rodar `bun test` e `tsgo` como fonte-de-verdade de qualidade estática.",
    ],
  };
}
