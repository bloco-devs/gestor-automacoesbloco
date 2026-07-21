/**
 * Human First UX — Language types.
 * Personas oficiais e chaves suportadas pelo dicionário.
 */

export type Persona = "solicitante" | "tecnica" | "gestor";

/** Chaves canônicas do dicionário (termos técnicos internos). */
export type TermKey =
  | "task"
  | "issue"
  | "bug"
  | "backlog"
  | "sprint"
  | "kanban"
  | "workflow"
  | "pipeline"
  | "ticket"
  | "epic"
  | "story"
  | "board"
  | "developer"
  | "release"
  | "deployment"
  | "command_palette"
  | "workspace"
  | "in_progress"
  | "done"
  | "todo"
  | "new_request"
  | "description"
  | "category"
  | "my_issues"
  | "search"
  | "go_to"
  | "open"
  | "create"
  | "find";

export type LanguageMap = Record<TermKey, string>;

/** Catálogo de erros amigáveis. */
export type FriendlyErrorKey =
  | "generic"
  | "network"
  | "timeout"
  | "unauthorized"
  | "notFound"
  | "rateLimit"
  | "server";

export interface FriendlyError {
  title: string;
  message: string;
  action: string;
  icon: "alert" | "wifi" | "clock" | "lock" | "search" | "server";
}
