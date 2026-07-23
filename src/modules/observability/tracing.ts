/**
 * FEATURE 026 — Distributed Tracing (Onda 2).
 * Ring buffer in-memory. Nenhuma persistência. Nenhum backend.
 *
 * Modelo:
 *   Trace = conjunto de Spans com o mesmo traceId.
 *   Span  = operação atômica com parentSpanId opcional.
 */

export type SpanStatus = "ok" | "error" | "cancelled" | "running";

export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  source: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: SpanStatus;
  metadata?: Record<string, unknown>;
}

const MAX = 500;
const spans: Span[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function newTraceId(): string {
  return nextId("t");
}

export function startSpan(input: {
  name: string;
  source: string;
  traceId?: string;
  parentSpanId?: string;
  metadata?: Record<string, unknown>;
}): Span {
  const span: Span = {
    spanId: nextId("s"),
    traceId: input.traceId ?? newTraceId(),
    parentSpanId: input.parentSpanId,
    name: input.name,
    source: input.source,
    startedAt: Date.now(),
    status: "running",
    metadata: input.metadata,
  };
  spans.push(span);
  if (spans.length > MAX) spans.shift();
  notify();
  return span;
}

export function endSpan(
  spanId: string,
  status: SpanStatus = "ok",
  metadata?: Record<string, unknown>,
): void {
  const s = spans.find((x) => x.spanId === spanId);
  if (!s) return;
  s.endedAt = Date.now();
  s.durationMs = s.endedAt - s.startedAt;
  s.status = status;
  if (metadata) s.metadata = { ...(s.metadata ?? {}), ...metadata };
  notify();
}

export function recordSpan(input: {
  name: string;
  source: string;
  durationMs: number;
  traceId?: string;
  parentSpanId?: string;
  status?: SpanStatus;
  metadata?: Record<string, unknown>;
}): Span {
  const startedAt = Date.now() - Math.max(0, input.durationMs);
  const span: Span = {
    spanId: nextId("s"),
    traceId: input.traceId ?? newTraceId(),
    parentSpanId: input.parentSpanId,
    name: input.name,
    source: input.source,
    startedAt,
    endedAt: Date.now(),
    durationMs: input.durationMs,
    status: input.status ?? "ok",
    metadata: input.metadata,
  };
  spans.push(span);
  if (spans.length > MAX) spans.shift();
  notify();
  return span;
}

export function spanHistory(): ReadonlyArray<Span> {
  return spans.slice();
}

export function tracesByRoot(): ReadonlyArray<{ traceId: string; spans: Span[] }> {
  const map = new Map<string, Span[]>();
  for (const s of spans) {
    const arr = map.get(s.traceId) ?? [];
    arr.push(s);
    map.set(s.traceId, arr);
  }
  return Array.from(map.entries())
    .map(([traceId, arr]) => ({
      traceId,
      spans: arr.slice().sort((a, b) => a.startedAt - b.startedAt),
    }))
    .sort((a, b) => (b.spans[0]?.startedAt ?? 0) - (a.spans[0]?.startedAt ?? 0));
}

export function subscribeSpans(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function __resetTracing(): void {
  spans.length = 0;
  listeners.clear();
  counter = 0;
}
