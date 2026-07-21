/**
 * Context Engine — store framework-agnóstico do WorkspaceContext.
 *
 * Não depende de React. Expõe: get / patch / subscribe / events.
 * Uma instância singleton (`contextEngine`) é usada pelo Provider e pelo
 * AI Orchestrator para leitura desacoplada.
 */
import { buildFromRoute, emptyContext } from "./context-builder";
import { createEventBus, type ContextEventBus } from "./context-events";
import type {
  BreadcrumbItem,
  EntityType,
  WorkspaceContext,
} from "./context-types";

export interface ContextEngine {
  get(): WorkspaceContext;
  subscribe(listener: () => void): () => void;
  events: ContextEventBus;
  // mutações
  setRoute(pathname: string): void;
  patch(partial: Partial<WorkspaceContext>): void;
  selectEntity(entityType: EntityType, entityId: string | null): void;
  selectCard(cardId: string | null): void;
  selectSprint(sprintId: string | null): void;
  setFilter(key: string, value: unknown): void;
  setBreadcrumbs(items: BreadcrumbItem[]): void;
  setCurrentUser(user: WorkspaceContext["currentUser"]): void;
  reset(): void;
}

export function createContextEngine(initial?: Partial<WorkspaceContext>): ContextEngine {
  let state: WorkspaceContext = { ...emptyContext(), ...initial, updatedAt: Date.now() };
  const listeners = new Set<() => void>();
  const events = createEventBus();

  function commit(next: WorkspaceContext) {
    state = { ...next, updatedAt: Date.now() };
    for (const l of listeners) l();
    events.emit("CONTEXT_CHANGED", { context: state });
  }

  const engine: ContextEngine = {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    events,

    setRoute(pathname) {
      if (pathname === state.route) return;
      const derived = buildFromRoute(pathname);
      const prevRoute = state.route;
      const prevModule = state.module;
      const next: WorkspaceContext = { ...state, ...derived };
      commit(next);
      if (prevRoute !== next.route) {
        events.emit("ROUTE_CHANGED", { previous: prevRoute, current: next.route });
      }
      if (prevModule !== next.module) {
        events.emit("MODULE_CHANGED", { previous: prevModule, current: next.module });
      }
    },

    patch(partial) {
      commit({ ...state, ...partial });
    },

    selectEntity(entityType, entityId) {
      commit({ ...state, entityType, entityId });
      events.emit("ENTITY_SELECTED", { entityType, entityId });
    },

    selectCard(cardId) {
      commit({ ...state, entityType: cardId ? "card" : "none", entityId: cardId });
      events.emit("CARD_SELECTED", { cardId });
      events.emit("ENTITY_SELECTED", { entityType: "card", entityId: cardId });
    },

    selectSprint(sprintId) {
      commit({ ...state, entityType: sprintId ? "sprint" : "none", entityId: sprintId });
      events.emit("SPRINT_SELECTED", { sprintId });
      events.emit("ENTITY_SELECTED", { entityType: "sprint", entityId: sprintId });
    },

    setFilter(key, value) {
      const filters = { ...state.filters, [key]: value };
      commit({ ...state, filters });
      events.emit("FILTER_CHANGED", { key, value });
    },

    setBreadcrumbs(items) {
      commit({ ...state, breadcrumbs: items });
    },

    setCurrentUser(user) {
      commit({ ...state, currentUser: user });
    },

    reset() {
      commit(emptyContext());
    },
  };

  return engine;
}

/** Instância singleton usada pelo Provider e pelo AI Orchestrator. */
export const contextEngine = createContextEngine();
