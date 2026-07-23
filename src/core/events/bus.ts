import type { DomainEvent, DomainEventName, PayloadOf } from "./events";

type Listener<N extends DomainEventName> = (event: Extract<DomainEvent, { name: N }>) => void;
type AnyListener = (event: DomainEvent) => void;

export interface DomainEventBus {
  on<N extends DomainEventName>(name: N, listener: Listener<N>): () => void;
  onAny(listener: AnyListener): () => void;
  emit<N extends DomainEventName>(name: N, payload: PayloadOf<N>, actorId?: string): void;
  clear(): void;
  history(): readonly DomainEvent[];
}

const HISTORY_LIMIT = 200;

export function createDomainEventBus(): DomainEventBus {
  const listeners = new Map<DomainEventName, Set<Listener<DomainEventName>>>();
  const anyListeners = new Set<AnyListener>();
  const history: DomainEvent[] = [];

  return {
    on(name, listener) {
      let bag = listeners.get(name);
      if (!bag) {
        bag = new Set();
        listeners.set(name, bag);
      }
      bag.add(listener as Listener<DomainEventName>);
      return () => {
        bag!.delete(listener as Listener<DomainEventName>);
      };
    },
    onAny(listener) {
      anyListeners.add(listener);
      return () => {
        anyListeners.delete(listener);
      };
    },
    emit(name, payload, actorId) {
      const evt = { name, v: 1, at: new Date().toISOString(), payload, actorId } as DomainEvent;
      history.push(evt);
      if (history.length > HISTORY_LIMIT) history.shift();
      listeners.get(name)?.forEach((l) => {
        try {
          (l as (e: DomainEvent) => void)(evt);
        } catch {
          /* isolar falha do listener */
        }
      });
      anyListeners.forEach((l) => {
        try { l(evt); } catch { /* noop */ }
      });
    },
    clear() {
      listeners.clear();
      anyListeners.clear();
      history.length = 0;
    },
    history() {
      return history.slice();
    },
  };
}

/** Bus global do processo. Módulos podem criar bus próprios se precisarem de isolamento. */
export const domainBus: DomainEventBus = createDomainEventBus();
