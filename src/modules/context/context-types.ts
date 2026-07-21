/**
 * Tipos do Context Engine.
 *
 * O Context Engine é framework-agnóstico. Nenhum tipo aqui pode depender de
 * React, do Router ou do Supabase.
 */

export type WorkspaceKind =
  | "requester"
  | "developer"
  | "engineering"
  | "unknown";

export type ModuleKey =
  | "dashboard"
  | "solicitacoes"
  | "kanban"
  | "solucoes"
  | "atividades"
  | "diagrama"
  | "observabilidade-ia"
  | "consolidacao"
  | "configuracoes"
  | "ajuda"
  | "perfil"
  | "ai-workspace"
  | "inbox"
  | "auth"
  | "unknown";

export type EntityType =
  | "card"
  | "board"
  | "sprint"
  | "solicitacao"
  | "solucao"
  | "sistema"
  | "conector"
  | "knowledge"
  | "none";

export interface CurrentUserContext {
  id: string | null;
  role: "requester" | "developer" | "admin" | "guest" | null;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Objeto único que representa o contexto atual da aplicação.
 * Consumido pelo AI Orchestrator via injeção de dependência.
 */
export interface WorkspaceContext {
  workspace: WorkspaceKind;
  module: ModuleKey;
  page: string;
  route: string;
  entityType: EntityType;
  entityId: string | null;
  selectedItems: string[];
  organizationId: string | null;
  currentUser: CurrentUserContext;
  breadcrumbs: BreadcrumbItem[];
  filters: Record<string, unknown>;
  metadata: Record<string, unknown>;
  /** Atualizado a cada mutação. Útil para debug e testes. */
  updatedAt: number;
}

/** Payloads de eventos internos do Context Engine. */
export type ContextEventMap = {
  MODULE_CHANGED: { previous: ModuleKey; current: ModuleKey };
  ROUTE_CHANGED: { previous: string; current: string };
  ENTITY_SELECTED: { entityType: EntityType; entityId: string | null };
  FILTER_CHANGED: { key: string; value: unknown };
  CARD_SELECTED: { cardId: string | null };
  SPRINT_SELECTED: { sprintId: string | null };
  CONTEXT_CHANGED: { context: WorkspaceContext };
};

export type ContextEventName = keyof ContextEventMap;

export type ContextEventListener<E extends ContextEventName> = (
  payload: ContextEventMap[E],
) => void;
