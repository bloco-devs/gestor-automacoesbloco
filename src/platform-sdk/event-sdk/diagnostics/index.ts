/**
 * Diagnostics — snapshot e histórico circular do Event SDK.
 * Não persiste em banco; apenas in-memory (Sandbox/Marketplace).
 */
import type { DispatchResult, EventEnvelope } from "../types";
import { eventExtensionRegistry, type EventRegistryDiagnostics } from "../registry";

const HISTORY_MAX = 50;
const eventHistory: Array<{
  envelopeId: string;
  event: string;
  createdAt: number;
  cancelled?: boolean;
  publisherId?: string;
}> = [];
const dispatchHistory: DispatchResult[] = [];
const eventQueue = new Set<string>();

export function recordEvent(env: EventEnvelope) {
  eventHistory.unshift({
    envelopeId: env.id,
    event: env.event,
    createdAt: env.createdAt,
    cancelled: env.cancelled,
    publisherId: env.publisherId,
  });
  if (eventHistory.length > HISTORY_MAX) eventHistory.length = HISTORY_MAX;
}

export function recordDispatch(r: DispatchResult) {
  dispatchHistory.unshift(r);
  if (dispatchHistory.length > HISTORY_MAX) dispatchHistory.length = HISTORY_MAX;
}

export function enqueueEvent(event: string) {
  eventQueue.add(event);
}
export function dequeueEvent(event: string) {
  eventQueue.delete(event);
}

export interface EventSdkDiagnostics {
  registry: EventRegistryDiagnostics;
  avgDurationMs: number;
  totalDispatched: number;
  totalCancelled: number;
  totalErrors: number;
  recentEvents: typeof eventHistory;
  recentDispatches: DispatchResult[];
  queueSize: number;
  updatedAt: number;
}

export function collectEventSdkDiagnostics(): EventSdkDiagnostics {
  const registry = eventExtensionRegistry.diagnostics();
  const durations = dispatchHistory.map((d) => d.durationMs);
  const avg =
    durations.length === 0
      ? 0
      : Math.round(durations.reduce((s, x) => s + x, 0) / durations.length);
  const cancelled = dispatchHistory.filter((d) => d.cancelled).length;
  const errors = dispatchHistory.reduce((s, d) => s + d.errors.length, 0);
  return {
    registry,
    avgDurationMs: avg,
    totalDispatched: dispatchHistory.length,
    totalCancelled: cancelled,
    totalErrors: errors,
    recentEvents: [...eventHistory],
    recentDispatches: [...dispatchHistory],
    queueSize: eventQueue.size,
    updatedAt: Date.now(),
  };
}

export function __resetEventSdkDiagnostics() {
  eventHistory.length = 0;
  dispatchHistory.length = 0;
  eventQueue.clear();
}
