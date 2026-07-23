/**
 * Service Mesh — Diagnostics.
 * Ring buffer in-memory. Nenhuma persistência. Consumido pelo Sandbox.
 */
export type MeshEventKind =
  | "provider.registered"
  | "provider.disposed"
  | "consumer.resolved"
  | "consumer.optional-missed"
  | "consumer.required-failed"
  | "capability.denied"
  | "version.incompatible"
  | "health.updated";

export interface MeshEvent {
  kind: MeshEventKind;
  at: number;
  pluginId?: string;
  serviceId?: string;
  contract?: string;
  detail?: string;
  durationMs?: number;
}

const MAX = 200;
const buffer: MeshEvent[] = [];
const listeners = new Set<() => void>();

export function recordMeshEvent(evt: Omit<MeshEvent, "at"> & { at?: number }): void {
  const full: MeshEvent = { ...evt, at: evt.at ?? Date.now() };
  buffer.push(full);
  if (buffer.length > MAX) buffer.shift();
  for (const l of listeners) l();
}

export function meshEventHistory(): ReadonlyArray<MeshEvent> {
  return buffer.slice();
}

export function subscribeMeshEvents(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function __resetMeshDiagnostics(): void {
  buffer.length = 0;
  listeners.clear();
}
