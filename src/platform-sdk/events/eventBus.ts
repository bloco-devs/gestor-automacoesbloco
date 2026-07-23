import type {
  EventBus,
  PlatformEventMap,
  PlatformEventName,
} from "../types";

/**
 * Typed pub/sub. In-memory. Sem side effects no core.
 * Ring buffer de 100 eventos para o Sandbox de leitura.
 */
export function createEventBus(): EventBus {
  const listeners = new Map<PlatformEventName, Set<(p: unknown) => void>>();
  const buffer: { name: PlatformEventName; payload: unknown; at: number }[] = [];
  const MAX = 100;

  return {
    emit(name, payload) {
      buffer.push({ name, payload, at: Date.now() });
      if (buffer.length > MAX) buffer.shift();
      const set = listeners.get(name);
      if (!set) return;
      for (const fn of set) {
        try {
          fn(payload);
        } catch (err) {
          // Isolamento: um handler ruim não derruba os demais.
          // eslint-disable-next-line no-console
          console.warn(`[platform-sdk] listener error for ${String(name)}`, err);
        }
      }
    },
    on(name, handler) {
      let set = listeners.get(name);
      if (!set) {
        set = new Set();
        listeners.set(name, set);
      }
      set.add(handler as (p: unknown) => void);
      return () => {
        set?.delete(handler as (p: unknown) => void);
      };
    },
    history() {
      return buffer.slice();
    },
  };
}

// Singleton compartilhado pelo host.
export const platformBus: EventBus = createEventBus();

// Re-export helpers tipados.
export function emit<K extends keyof PlatformEventMap>(
  name: K,
  payload: PlatformEventMap[K]
) {
  platformBus.emit(name, payload);
}
