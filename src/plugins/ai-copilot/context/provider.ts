/**
 * Context Provider do Copilot.
 * Consumidor read-only do Context Engine do core.
 * Nenhum código do Context Engine é alterado.
 */
import { contextEngine, type WorkspaceContext } from "@/modules/context";

export function readCopilotContext(): WorkspaceContext {
  return contextEngine.get();
}

/**
 * Snapshot compacto para exibir no Copilot Dock / Sandbox.
 */
export interface CopilotContextSnapshot {
  route: string;
  module: string;
  entity: string;
  role: string;
  breadcrumbs: string[];
}

export function summarizeCopilotContext(
  ctx: WorkspaceContext = readCopilotContext(),
): CopilotContextSnapshot {
  return {
    route: ctx.route,
    module: ctx.module,
    entity:
      ctx.entityType !== "none"
        ? `${ctx.entityType}${ctx.entityId ? `#${ctx.entityId}` : ""}`
        : "—",
    role: ctx.currentUser.role ?? "guest",
    breadcrumbs: ctx.breadcrumbs.map((b) => b.label),
  };
}
