/**
 * AI Copilot Plugin — Types
 * PLUGIN 001. Camada tipada isolada do core.
 */
import type { ModuleKey, WorkspaceContext } from "@/modules/context";

export type CopilotState =
  | "welcome"
  | "loading"
  | "thinking"
  | "streaming"
  | "completed"
  | "error";

export type CopilotEventName =
  | "plugin.loaded"
  | "copilot.opened"
  | "copilot.closed"
  | "copilot.action.executed"
  | "copilot.prompt.generated"
  | "copilot.error";

export interface CopilotEventPayloadMap {
  "plugin.loaded": { pluginId: string; at: number };
  "copilot.opened": { at: number; source?: string };
  "copilot.closed": { at: number };
  "copilot.action.executed": { actionId: string; module: ModuleKey };
  "copilot.prompt.generated": {
    module: ModuleKey;
    template: string;
    tokensEstimated: number;
  };
  "copilot.error": { message: string; where: string };
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: number;
  meta?: Record<string, unknown>;
}

export interface CopilotAction {
  id: string;
  label: string;
  description: string;
  /** Módulos onde a ação é relevante. Vazio = todos. */
  modules: ModuleKey[];
  /** Retorna o prompt final a partir do contexto. */
  buildPrompt: (ctx: WorkspaceContext) => string;
}

export interface CopilotPromptTemplate {
  id: string;
  module: ModuleKey | "default";
  system: string;
  hint: string;
}

export interface CopilotDiagnosticEntry {
  at: number;
  actionId: string;
  module: ModuleKey;
  template: string;
  tokensEstimated: number;
  contextSummary: string;
  durationMs: number;
}
