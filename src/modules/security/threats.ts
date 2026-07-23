/**
 * Threat Center — ring buffer in-memory.
 * Consumidores registram ameaças via `recordThreat(...)`. Somente leitura para UI.
 */
import { useEffect, useState } from "react";

export type ThreatSeverity = "low" | "medium" | "high" | "critical";
export type ThreatKind =
  | "auth.invalid-attempt"
  | "auth.repeated-failure"
  | "auth.suspicious"
  | "plugin.rejected"
  | "plugin.dependency-incompatible"
  | "plugin.signature-invalid"
  | "mesh.capability-denied"
  | "event.cancelled"
  | "ai.error"
  | "workflow.error"
  | "runtime.error"
  | "other";

export interface ThreatEvent {
  id: string;
  at: number;
  kind: ThreatKind;
  severity: ThreatSeverity;
  origin: string;
  message: string;
  detail?: string;
}

const MAX = 500;
const buffer: ThreatEvent[] = [];
const listeners = new Set<() => void>();

export function recordThreat(evt: Omit<ThreatEvent, "id" | "at"> & { at?: number }): ThreatEvent {
  const full: ThreatEvent = {
    id: `thr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: evt.at ?? Date.now(),
    ...evt,
  };
  buffer.push(full);
  if (buffer.length > MAX) buffer.shift();
  for (const l of listeners) l();
  return full;
}

export function threatHistory(): ReadonlyArray<ThreatEvent> {
  return buffer.slice().reverse();
}

export function clearThreats(): void {
  buffer.length = 0;
  for (const l of listeners) l();
}

export function useThreatHistory(): ReadonlyArray<ThreatEvent> {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return threatHistory();
}
