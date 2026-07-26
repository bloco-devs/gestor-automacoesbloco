/**
 * Hooks reutilizáveis do Context Engine.
 * Usam useSyncExternalStore + selectors para evitar re-renderizações.
 */
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useContextEngine } from "./context-provider";
import {
  selectAIContext,
  selectBreadcrumbs,
  selectEntity,
  selectModule,
} from "./context-selectors";
import { shallowEqual } from "@/lib/stable-snapshot";
import type { WorkspaceContext } from "./context-types";

function useSelector<T>(selector: (c: WorkspaceContext) => T): T {
  const engine = useContextEngine();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  // Mantém a referência estável entre chamadas: React exige que getSnapshot
  // retorne o mesmo valor enquanto o store não mudar (evita loop infinito).
  const cache = useRef<{ has: boolean; value: T }>({ has: false, value: undefined as T });

  const subscribe = useCallback((l: () => void) => engine.subscribe(l), [engine]);
  const getSnapshot = useCallback(() => {
    const next = selectorRef.current(engine.get());
    if (cache.current.has && shallowEqual(cache.current.value, next)) {
      return cache.current.value;
    }
    cache.current = { has: true, value: next };
    return next;
  }, [engine]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}


export function useWorkspaceContext() {
  return useSelector((c) => c);
}

export function useAIWorkspaceSnapshot() {
  return useSelector(selectAIContext);
}

export function useCurrentModule() {
  return useSelector(selectModule);
}

export function useSelectedEntity() {
  return useSelector(selectEntity);
}

export function useBreadcrumbs() {
  return useSelector(selectBreadcrumbs);
}

/** Ações de mutação do contexto (estáveis por referência). */
export function useContextActions() {
  const engine = useContextEngine();
  return {
    patch: engine.patch,
    selectEntity: engine.selectEntity,
    selectCard: engine.selectCard,
    selectSprint: engine.selectSprint,
    setFilter: engine.setFilter,
    setBreadcrumbs: engine.setBreadcrumbs,
    on: engine.events.on,
  };
}
