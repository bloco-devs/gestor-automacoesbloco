import type { PipelineDefinition, PipelineId } from "./pipeline-types";

/**
 * Mapeia cada pipeline lógico ao serviço destino. Trocar o target aqui
 * substitui o comportamento sem tocar no Workspace ou no Intent Engine.
 */
export const PIPELINE_REGISTRY: Record<PipelineId, PipelineDefinition> = {
  bug: {
    id: "bug",
    label: "Pipeline · Bug",
    target: "triagem-demanda",
    handlerKey: "conversational+triage",
  },
  incident: {
    id: "incident",
    label: "Pipeline · Incidente",
    target: "triagem-demanda",
    handlerKey: "conversational+triage",
  },
  feature: {
    id: "feature",
    label: "Pipeline · Feature Request",
    target: "assistente-demanda",
    handlerKey: "conversational+triage",
  },
  improvement: {
    id: "improvement",
    label: "Pipeline · Melhoria",
    target: "assistente-demanda",
    handlerKey: "conversational+triage",
  },
  automation: {
    id: "automation",
    label: "Pipeline · Automação",
    target: "assistente-demanda",
    handlerKey: "conversational+triage",
  },
  question: {
    id: "question",
    label: "Pipeline · Pergunta",
    target: "assistente-demanda",
    handlerKey: "immediate-answer",
  },
  knowledge: {
    id: "knowledge",
    label: "Pipeline · Conhecimento",
    target: "assistente-demanda",
    handlerKey: "immediate-answer",
  },
  support: {
    id: "support",
    label: "Pipeline · Suporte",
    target: "assistente-demanda",
    handlerKey: "conversational+triage",
  },
  unknown: {
    id: "unknown",
    label: "Pipeline · Não classificado",
    target: "assistente-demanda",
    handlerKey: "conversational+triage",
  },
};

export function getPipelineDefinition(id: PipelineId): PipelineDefinition {
  return PIPELINE_REGISTRY[id];
}
