/**
 * FEATURE 026 — Developer Experience (DX) Center.
 * Módulo aditivo e read-only. Reutiliza APIs existentes:
 *   - Observability (traces, aggregators, scores, dependency graph)
 *   - Platform Health, Errors, Audit
 *   - Service Mesh, Plugin Host, AI SDK, Workflow SDK, Event SDK, Orchestrator
 *   - React Query client (via useQueryClient)
 *
 * Nenhum runtime é alterado — apenas superfície de leitura para desenvolvedores.
 */

export { getEnvironmentInfo, type EnvironmentInfo } from "./environment";
export {
  getBookmarks,
  addBookmark,
  removeBookmark,
  getRecent,
  pushRecent,
  getPinnedPanels,
  togglePinnedPanel,
  type Bookmark,
} from "./productivity";
export { collectCodeHealth, type CodeHealthReport } from "./codeHealth";
export { DEVELOPER_ROUTES, type DeveloperRoute } from "./routes";
