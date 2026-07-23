/**
 * Copilot Event Bus — scoped ao plugin.
 * Não usa o platformBus tipado (que só aceita PlatformEventMap do core).
 * Ring buffer de 100 eventos, para o Sandbox.
 */
import type { CopilotEventName, CopilotEventPayloadMap } from "./types";

type AnyPayload = CopilotEventPayloadMap[CopilotEventName];

const MAX = 100;
const listeners = new Map<CopilotEventName, Set<(p: AnyPayload) => void>>();
const buffer: { name: CopilotEventName; payload: AnyPayload; at: number }[] = [];
const globalListeners = new Set<() => void>();

export function emitCopilotEvent<K extends CopilotEventName>(
  name: K,
  payload: CopilotEventPayloadMap[K],
): void {
  buffer.push({ name, payload, at: Date.now() });
  if (buffer.length > MAX) buffer.shift();
  const set = listeners.get(name);
  if (set) {
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[ai-copilot] listener error", err);
      }
    }
  }
  for (const l of globalListeners) l();
}

export function onCopilotEvent<K extends CopilotEventName>(
  name: K,
  handler: (p: CopilotEventPayloadMap[K]) => void,
): () => void {
  let set = listeners.get(name);
  if (!set) {
    set = new Set();
    listeners.set(name, set);
  }
  set.add(handler as (p: AnyPayload) => void);
  return () => set?.delete(handler as (p: AnyPayload) => void);
}

export function copilotEventHistory() {
  return buffer.slice();
}

export function subscribeCopilotEvents(fn: () => void): () => void {
  globalListeners.add(fn);
  return () => globalListeners.delete(fn);
}

export function __resetCopilotEventsForTests() {
  listeners.clear();
  buffer.length = 0;
  globalListeners.clear();
}
