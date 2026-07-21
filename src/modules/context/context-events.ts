/**
 * Pub/sub tipado usado internamente pelo Context Engine.
 * Sem dependências externas — 100% testável em node.
 */
import type {
  ContextEventListener,
  ContextEventMap,
  ContextEventName,
} from "./context-types";

type Bag = {
  [E in ContextEventName]: Set<ContextEventListener<E>>;
};

function createBag(): Bag {
  return {
    MODULE_CHANGED: new Set(),
    ROUTE_CHANGED: new Set(),
    ENTITY_SELECTED: new Set(),
    FILTER_CHANGED: new Set(),
    CARD_SELECTED: new Set(),
    SPRINT_SELECTED: new Set(),
    CONTEXT_CHANGED: new Set(),
  };
}

export interface ContextEventBus {
  on<E extends ContextEventName>(
    event: E,
    listener: ContextEventListener<E>,
  ): () => void;
  emit<E extends ContextEventName>(event: E, payload: ContextEventMap[E]): void;
  clear(): void;
}

export function createEventBus(): ContextEventBus {
  const bag = createBag();
  return {
    on(event, listener) {
      (bag[event] as Set<typeof listener>).add(listener);
      return () => {
        (bag[event] as Set<typeof listener>).delete(listener);
      };
    },
    emit(event, payload) {
      for (const listener of bag[event]) {
        try {
          (listener as (p: unknown) => void)(payload);
        } catch (err) {
          // Um listener defeituoso nunca deve travar os demais.
          // eslint-disable-next-line no-console
          console.error(`[context-events] listener error on ${event}`, err);
        }
      }
    },
    clear() {
      (Object.keys(bag) as ContextEventName[]).forEach((k) => bag[k].clear());
    },
  };
}
