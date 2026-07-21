/**
 * Selectors puros sobre o WorkspaceContext.
 * Reutilizados por hooks e pelo Orchestrator para evitar re-renderizações.
 */
import type { WorkspaceContext } from "./context-types";

export const selectModule = (c: WorkspaceContext) => c.module;
export const selectRoute = (c: WorkspaceContext) => c.route;
export const selectWorkspace = (c: WorkspaceContext) => c.workspace;
export const selectEntity = (c: WorkspaceContext) => ({
  type: c.entityType,
  id: c.entityId,
});
export const selectBreadcrumbs = (c: WorkspaceContext) => c.breadcrumbs;
export const selectFilters = (c: WorkspaceContext) => c.filters;
export const selectCurrentUser = (c: WorkspaceContext) => c.currentUser;

/** Snapshot compacto usado pelo AI Orchestrator. */
export function selectAIContext(c: WorkspaceContext) {
  return {
    workspace: c.workspace,
    module: c.module,
    page: c.page,
    route: c.route,
    entityType: c.entityType,
    entityId: c.entityId,
    userRole: c.currentUser.role,
    breadcrumbs: c.breadcrumbs.map((b) => b.label),
    filters: c.filters,
  };
}

export type AIContextSnapshot = ReturnType<typeof selectAIContext>;
