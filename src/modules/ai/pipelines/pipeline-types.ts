import type { Conversation } from "../types/conversation";
import type { IntentClassification } from "../types/classification";

export const PIPELINE_IDS = [
  "bug",
  "feature",
  "automation",
  "question",
  "knowledge",
  "incident",
  "improvement",
  "support",
  "unknown",
] as const;

export type PipelineId = (typeof PIPELINE_IDS)[number];

/** Nome simbólico da edge function/serviço destino. O runner NÃO chama diretamente. */
export type PipelineTarget =
  | "assistente-demanda"
  | "triagem-demanda"
  | "demandas-similares"
  | "noop";

export interface PipelineContext {
  conversation: Conversation;
  classification: IntentClassification;
}

export interface PipelineResult {
  pipeline: PipelineId;
  target: PipelineTarget;
  classification: IntentClassification;
  /** Handler que o consumidor deve executar (Workspace fornece via orchestrator). */
  handlerKey: PipelineHandlerKey;
}

export type PipelineHandlerKey =
  | "conversational"
  | "conversational+triage"
  | "immediate-answer";

export interface PipelineDefinition {
  id: PipelineId;
  label: string;
  target: PipelineTarget;
  handlerKey: PipelineHandlerKey;
}
