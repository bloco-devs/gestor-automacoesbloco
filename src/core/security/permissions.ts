/**
 * Permission Matrix — client-side.
 * A fonte da verdade continua sendo o RLS + `has_role()` no Postgres.
 * Este módulo espelha as regras para melhorar UX (esconder ações que o backend rejeitaria).
 */
export type AppRole = "admin" | "developer" | "solicitante" | "requester" | "user" | "moderator";

export type Action =
  | "board.admin"
  | "board.edit"
  | "board.view"
  | "card.create"
  | "card.duplicate"
  | "card.move_across_boards"
  | "workflow.edit"
  | "workflow.execute"
  | "automation.execute"
  | "template.manage"
  | "admin.access";

const matrix: Record<Action, AppRole[]> = {
  "board.admin": ["admin"],
  "board.edit": ["admin", "developer"],
  "board.view": ["admin", "developer", "solicitante", "requester", "user", "moderator"],
  "card.create": ["admin", "developer"],
  "card.duplicate": ["admin", "developer"],
  "card.move_across_boards": ["admin"],
  "workflow.edit": ["admin"],
  "workflow.execute": ["admin", "developer"],
  "automation.execute": ["admin", "developer"],
  "template.manage": ["admin"],
  "admin.access": ["admin"],
};

export function canRoleDo(role: AppRole | null | undefined, action: Action): boolean {
  if (!role) return false;
  return matrix[action]?.includes(role) ?? false;
}

export function actionsFor(role: AppRole | null | undefined): Action[] {
  if (!role) return [];
  return (Object.keys(matrix) as Action[]).filter((a) => matrix[a].includes(role));
}
