import type { IntentId } from "../intent/intent-types";
import type { PipelineId } from "../pipelines/pipeline-types";

export interface IntentClassification {
  intent: IntentId;
  confidence: number;
  pipeline: PipelineId;
  shouldCreateTicket: boolean;
  shouldAskQuestion: boolean;
  shouldSearchKnowledge: boolean;
  shouldRespondImmediately: boolean;
  suggestedPriority: "Alta" | "Média" | "Baixa" | null;
  suggestedCategory: string | null;
  suggestedSystem: string | null;
  matchedKeywords: string[];
}
