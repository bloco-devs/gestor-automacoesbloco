/**
 * Builders utilitários para compor pedaços do WorkspaceContext.
 * Puro — não conhece React nem o Router.
 */
import type {
  BreadcrumbItem,
  EntityType,
  ModuleKey,
  WorkspaceContext,
  WorkspaceKind,
} from "./context-types";

export function emptyContext(): WorkspaceContext {
  return {
    workspace: "unknown",
    module: "unknown",
    page: "",
    route: "/",
    entityType: "none",
    entityId: null,
    selectedItems: [],
    organizationId: null,
    currentUser: { id: null, role: null },
    breadcrumbs: [],
    filters: {},
    metadata: {},
    updatedAt: 0,
  };
}

/**
 * Deriva `module`, `page` e `workspace` a partir do pathname.
 * Regras simples baseadas nas rotas atuais do app.
 */
export function buildFromRoute(pathname: string): Pick<
  WorkspaceContext,
  "module" | "page" | "route" | "workspace" | "entityType" | "entityId"
> {
  const clean = pathname.split("?")[0].split("#")[0] || "/";
  const parts = clean.split("/").filter(Boolean);
  const head = parts[0] ?? "";
  const tail = parts[parts.length - 1] ?? "";

  let module: ModuleKey = "unknown";
  let workspace: WorkspaceKind = "unknown";
  let entityType: EntityType = "none";
  let entityId: string | null = null;

  const isId = (v: string) => /^[a-f0-9-]{8,}$/i.test(v) || /^\d+$/.test(v);

  switch (head) {
    case "":
      module = "unknown";
      break;
    case "auth":
    case "sso":
    case "redefinir-senha":
    case "escolher-perfil":
      module = "auth";
      break;
    case "dashboard":
      module = "dashboard";
      workspace = "developer";
      break;
    case "dashboard-solicitante":
      module = "dashboard";
      workspace = "requester";
      break;
    case "solicitacoes":
      module = parts[1] === "kanban" ? "kanban" : "solicitacoes";
      workspace = "developer";
      break;
    case "kanban":
      module = "kanban";
      workspace = "developer";
      break;
    case "solucoes":
      module = "solucoes";
      workspace = "developer";
      if (parts[1] && isId(parts[1])) {
        entityType = "solucao";
        entityId = parts[1];
      }
      break;
    case "solicitacao":
      module = "solicitacoes";
      if (parts[1]) {
        entityType = "solicitacao";
        entityId = parts[1];
      }
      break;
    case "nova-solicitacao":
    case "solicitar":
      module = "ai-workspace";
      workspace = "requester";
      break;
    case "minhas-solicitacoes":
      module = "solicitacoes";
      workspace = "requester";
      break;
    case "atividades":
      module = "atividades";
      workspace = "engineering";
      if (parts[1] && parts[1] !== "importar") {
        entityType = "board";
        entityId = parts[1];
      }
      break;
    case "diagrama":
      module = "diagrama";
      workspace = "engineering";
      break;
    case "ecossistema":
      module = "ecossistema";
      workspace = "engineering";
      if (parts[1]) {
        entityType = "sistema";
        entityId = parts[1];
      }
      break;
    case "observabilidade-ia":
      module = "observabilidade-ia";
      break;
    case "consolidacao":
      module = "consolidacao";
      break;
    case "configuracoes":
      module = "configuracoes";
      break;
    case "ajuda":
      module = "ajuda";
      break;
    case "perfil":
      module = "perfil";
      break;
    case "trabalho":
      module = parts[1] === "inbox" ? "inbox" : "unknown";
      workspace = "engineering";
      break;
    default:
      module = "unknown";
  }

  return {
    module,
    page: tail || head || "index",
    route: clean,
    workspace,
    entityType,
    entityId,
  };
}

export function buildCardContext(cardId: string, extras?: Partial<WorkspaceContext>) {
  return {
    entityType: "card" as EntityType,
    entityId: cardId,
    ...extras,
  };
}

export function buildSprintContext(sprintId: string, extras?: Partial<WorkspaceContext>) {
  return {
    entityType: "sprint" as EntityType,
    entityId: sprintId,
    ...extras,
  };
}

export function buildDashboardContext(extras?: Partial<WorkspaceContext>) {
  return { module: "dashboard" as ModuleKey, ...extras };
}

export function buildKnowledgeContext(entityId: string | null = null) {
  return {
    module: "ajuda" as ModuleKey,
    entityType: "knowledge" as EntityType,
    entityId,
  };
}

export function withBreadcrumbs(items: BreadcrumbItem[]) {
  return { breadcrumbs: items };
}
