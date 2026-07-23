/**
 * Security Timeline — agrega eventos de Audit, Errors, Threats e Service Mesh
 * em uma trilha única com filtro/busca/exportação.
 */
import { auditHistory } from "@/modules/audit";
import { errorHistory } from "@/modules/errors";
import { meshEventHistory } from "@/platform-sdk/services/diagnostics";
import { threatHistory } from "./threats";

export type TimelineSource = "audit" | "error" | "threat" | "mesh";
export type TimelineLevel = "info" | "warning" | "error";

export interface TimelineEntry {
  id: string;
  at: number;
  source: TimelineSource;
  level: TimelineLevel;
  title: string;
  detail?: string;
  origin?: string;
}

export function collectTimeline(): TimelineEntry[] {
  const out: TimelineEntry[] = [];

  for (const e of auditHistory()) {
    out.push({
      id: `audit:${e.id}`,
      at: e.at,
      source: "audit",
      level: e.result === "failure" ? "error" : e.result === "warning" ? "warning" : "info",
      title: `[${e.type}] ${e.detail ?? e.result}`,
      detail: e.detail,
      origin: e.origin ?? e.actor,
    });
  }
  for (const e of errorHistory()) {
    out.push({
      id: `error:${e.id}`,
      at: e.at,
      source: "error",
      level: e.severity === "critical" || e.severity === "error" ? "error" : e.severity === "warning" ? "warning" : "info",
      title: e.message,
      detail: e.detail,
      origin: e.origin ?? e.source,
    });
  }
  for (const e of threatHistory()) {
    out.push({
      id: `threat:${e.id}`,
      at: e.at,
      source: "threat",
      level: e.severity === "critical" || e.severity === "high" ? "error" : e.severity === "medium" ? "warning" : "info",
      title: `[${e.kind}] ${e.message}`,
      detail: e.detail,
      origin: e.origin,
    });
  }
  for (const e of meshEventHistory()) {
    const err =
      e.kind === "consumer.required-failed" || e.kind === "capability.denied" || e.kind === "version.incompatible";
    out.push({
      id: `mesh:${e.at}:${e.contract ?? e.serviceId ?? ""}`,
      at: e.at,
      source: "mesh",
      level: err ? "error" : "info",
      title: e.kind,
      detail: e.detail,
      origin: e.pluginId ?? e.serviceId,
    });
  }

  return out.sort((a, b) => b.at - a.at);
}

export function timelineToCsv(entries: ReadonlyArray<TimelineEntry>): string {
  const header = ["at", "source", "level", "title", "detail", "origin"];
  const lines = entries.map((e) =>
    [new Date(e.at).toISOString(), e.source, e.level, e.title, e.detail ?? "", e.origin ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
