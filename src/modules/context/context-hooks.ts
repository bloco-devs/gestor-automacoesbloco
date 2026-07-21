/**
 * Hooks reutilizáveis do Context Engine.
 * Usam useSyncExternalStore + selectors para evitar re-renderizações.
 */
import { useCallback, useSyncExternalStore } from "react";
import { useContextEngine } from "./context-provider";
import {
  selectAIContext,
  selectBreadcrumbs,
  selectEntity,
  selectModule,
} from "./context-selectors";
import type { WorkspaceContext } from "./context-types";

function useSelector<T>(selector: (c: WorkspaceContext) => T): T {
  const engine = useContextEngine();
  const subscribe = useCallback(
    (l: () => void) => engine.subscribe(l),
    [engine],
  );
  const getSnapshot = useCallback(() => selector(engine.get()), [engine, selector]);
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
