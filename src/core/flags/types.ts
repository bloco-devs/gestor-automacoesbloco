/**
 * Feature Flags — tipos base.
 * Cada categoria expõe suas próprias chaves em arquivos dedicados (kanban.flags.ts, etc).
 */
export type FlagCategory =
  | "kanban"
  | "dashboard"
  | "workflow"
  | "automation"
  | "ai"
  | "ux"
  | "search"
  | "timeline"
  | "templates"
  | "observability";

export interface FlagDefinition {
  key: string;
  category: FlagCategory;
  description: string;
  defaultValue: boolean;
  /** Fonte esperada em runtime: env var opcional. */
  envVar?: string;
}

export type FlagKey = string;
