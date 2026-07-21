export const INTENT_IDS = [
  "BUG",
  "FEATURE_REQUEST",
  "AUTOMATION",
  "QUESTION",
  "KNOWLEDGE",
  "INCIDENT",
  "IMPROVEMENT",
  "SUPPORT",
  "UNKNOWN",
] as const;

export type IntentId = (typeof INTENT_IDS)[number];

export interface IntentDefinition {
  id: IntentId;
  label: string;
  description: string;
  /** Regex/keywords used by the heuristic resolver. Lowercased. */
  keywords: string[];
  /** Extra regex patterns for stronger matches. */
  patterns?: RegExp[];
  pipeline: import("../pipelines/pipeline-types").PipelineId;
  shouldCreateTicket: boolean;
  shouldAskQuestion: boolean;
  shouldSearchKnowledge: boolean;
  shouldRespondImmediately: boolean;
  suggestedPriority: "Alta" | "Média" | "Baixa" | null;
  suggestedCategory: string | null;
}
