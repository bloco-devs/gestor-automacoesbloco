/**
 * FEATURE 023 — Error Center (Onda 2)
 * Ring buffer in-memory (últimos 500 eventos). Sem backend.
 * Captura javascript errors, unhandled promise rejections, e chamadas explícitas
 * de módulos (plugin/workflow/routing/ai/knowledge/mesh/runtime).
 */
import { useEffect, useState } from "react";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";
export type ErrorSource =
  | "javascript"
  | "react"
  | "promise"
  | "plugin"
  | "workflow"
  | "routing"
  | "ai"
  | "knowledge"
  | "mesh"
  | "runtime"
  | "unknown";

export interface ErrorEvent {
  id: string;
  at: number;
  severity: ErrorSeverity;
  source: ErrorSource;
  message: string;
  detail?: string;
  origin?: string;
  pluginId?: string;
}

const MAX = 500;
const buffer: ErrorEvent[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function recordError(evt: Omit<ErrorEvent, "id" | "at"> & { at?: number }): ErrorEvent {
  const full: ErrorEvent = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: evt.at ?? Date.now(),
    ...evt,
  };
  buffer.push(full);
  if (buffer.length > MAX) buffer.shift();
  notify();
  return full;
}

export function errorHistory(): ReadonlyArray<ErrorEvent> {
  return buffer.slice().reverse();
}

export function subscribeErrors(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function clearErrors(): void {
  buffer.length = 0;
  notify();
}

let attached = false;
export function attachGlobalErrorHandlers(): void {
  if (attached || typeof window === "undefined") return;
  attached = true;
  window.addEventListener("error", (e) => {
    recordError({
      severity: "error",
      source: "javascript",
      message: e.message || "Erro JS não identificado",
      detail: e.error?.stack ?? undefined,
      origin: e.filename,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    recordError({
      severity: "error",
      source: "promise",
      message:
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection",
      detail: reason instanceof Error ? reason.stack : JSON.stringify(reason)?.slice(0, 500),
    });
  });
}

export function useErrorHistory(): ReadonlyArray<ErrorEvent> {
  const [, setTick] = useState(0);
  useEffect(() => subscribeErrors(() => setTick((t) => t + 1)), []);
  return errorHistory();
}
