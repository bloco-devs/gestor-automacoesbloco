/**
 * FEATURE 023 — Audit Center (Onda 7)
 * Central única de eventos de auditoria (in-memory).
 */
import { useEffect, useState } from "react";

export type AuditType =
  | "login"
  | "logout"
  | "permission"
  | "workflow"
  | "plugin"
  | "marketplace"
  | "ai"
  | "knowledge"
  | "analytics"
  | "portal"
  | "workspace"
  | "sdk"
  | "config"
  | "flag"
  | "other";

export type AuditResult = "success" | "failure" | "warning";

export interface AuditEvent {
  id: string;
  at: number;
  type: AuditType;
  actor?: string;
  origin?: string;
  detail?: string;
  result: AuditResult;
}

const MAX = 1000;
const buffer: AuditEvent[] = [];
const listeners = new Set<() => void>();

export function recordAudit(evt: Omit<AuditEvent, "id" | "at"> & { at?: number }): AuditEvent {
  const full: AuditEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: evt.at ?? Date.now(),
    ...evt,
  };
  buffer.push(full);
  if (buffer.length > MAX) buffer.shift();
  for (const l of listeners) l();
  return full;
}

export function auditHistory(): ReadonlyArray<AuditEvent> {
  return buffer.slice().reverse();
}

export function useAuditHistory(): ReadonlyArray<AuditEvent> {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return auditHistory();
}

export function auditToCsv(events: ReadonlyArray<AuditEvent>): string {
  const header = ["id", "at", "type", "actor", "origin", "detail", "result"];
  const lines = events.map((e) =>
    [e.id, new Date(e.at).toISOString(), e.type, e.actor ?? "", e.origin ?? "", (e.detail ?? "").replace(/"/g, '""'), e.result]
      .map((v) => `"${String(v)}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
