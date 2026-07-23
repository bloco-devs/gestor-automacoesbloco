/**
 * Enterprise Reports — geradores CSV que compõem várias fontes read-only.
 */
import { auditHistory, auditToCsv } from "@/modules/audit";
import { errorHistory } from "@/modules/errors";
import { collectRuntimeHealth } from "@/modules/platform-health";
import { pluginHost } from "@/platform-sdk/runtime";
import { meshEventHistory } from "@/platform-sdk/services/diagnostics";
import { FRAMEWORKS, scoreFramework } from "./compliance";
import { computeSecurityScore } from "./score";
import { runIntegrityChecks } from "./integrity";
import { threatHistory } from "./threats";
import { collectTimeline, timelineToCsv } from "./timeline";

function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function buildSecurityReport(): string {
  const s = computeSecurityScore();
  return toCsv([
    ["Security Report", new Date().toISOString()],
    [],
    ["Overall", s.overall],
    [],
    ["Category", "Score", "Weight", "Detail"],
    ...s.categories.map((c) => [c.label, c.score, c.weight, c.detail]),
    [],
    ["Recommendations"],
    ...s.recommendations.map((r) => [r]),
  ]);
}

export function buildComplianceReport(): string {
  return toCsv([
    ["Compliance Report", new Date().toISOString()],
    [],
    ["Framework", "Score", "Items"],
    ...FRAMEWORKS.map((fw) => [fw.label, scoreFramework(fw), fw.items.length]),
    [],
    ["Framework", "Item", "Status", "Note"],
    ...FRAMEWORKS.flatMap((fw) => fw.items.map((it) => [fw.label, it.label, it.status, it.note ?? ""])),
  ]);
}

export function buildAuditReport(): string {
  return auditToCsv(auditHistory());
}

export function buildGovernanceReport(): string {
  const threats = threatHistory();
  const errors = errorHistory();
  return toCsv([
    ["Governance Report", new Date().toISOString()],
    [],
    ["Threats total", threats.length],
    ["Errors total", errors.length],
    ["Audit total", auditHistory().length],
    [],
    ["Integrity Issues"],
    ["Area", "Severity", "Title", "Detail"],
    ...runIntegrityChecks().map((i) => [i.area, i.severity, i.title, i.detail]),
  ]);
}

export function buildPluginReport(): string {
  try {
    const diag = pluginHost.diagnostics();
    return toCsv([
      ["Plugin Report", new Date().toISOString()],
      [],
      ["ID", "Status", "Enabled", "Version", "Error"],
      ...(diag.plugins ?? []).map((p) => [p.id, p.status, p.status === "active" ? "yes" : "no", p.version, p.error ?? ""]),
    ]);
  } catch {
    return "Plugin Report\nDiagnostics unavailable\n";
  }
}

export function buildSdkReport(): string {
  return toCsv([
    ["SDK Report", new Date().toISOString()],
    [],
    ["Component", "Version"],
    ["Platform SDK", "1.0.0"],
    ["Plugin Host", "1.0.0"],
    ["Workflow SDK", "1.0.0"],
    ["Event SDK", "1.0.0"],
    ["AI SDK", "1.0.0"],
    ["AI Orchestrator", "1.0.0"],
  ]);
}

export function buildMeshReport(): string {
  return toCsv([
    ["Service Mesh Report", new Date().toISOString()],
    [],
    ["Kind", "Timestamp", "PluginId", "Contract", "Service", "Detail"],
    ...meshEventHistory().map((e) => [
      e.kind,
      new Date(e.at).toISOString(),
      e.pluginId ?? "",
      e.contract ?? "",
      e.serviceId ?? "",
      e.detail ?? "",
    ]),
  ]);
}

export function buildArchitectureReport(): string {
  return toCsv([
    ["Architecture Report", new Date().toISOString()],
    [],
    ["Runtime", "Status", "Detail"],
    ...collectRuntimeHealth().map((r) => [r.label, r.status, r.detail]),
  ]);
}

export function buildTimelineReport(): string {
  return timelineToCsv(collectTimeline());
}

export const REPORTS: Array<{ id: string; label: string; build: () => string }> = [
  { id: "security", label: "Security Report", build: buildSecurityReport },
  { id: "compliance", label: "Compliance Report", build: buildComplianceReport },
  { id: "audit", label: "Audit Report", build: buildAuditReport },
  { id: "governance", label: "Governance Report", build: buildGovernanceReport },
  { id: "plugin", label: "Plugin Report", build: buildPluginReport },
  { id: "sdk", label: "SDK Report", build: buildSdkReport },
  { id: "mesh", label: "Service Mesh Report", build: buildMeshReport },
  { id: "architecture", label: "Architecture Report", build: buildArchitectureReport },
  { id: "timeline", label: "Timeline Report", build: buildTimelineReport },
];

export function downloadCsv(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
