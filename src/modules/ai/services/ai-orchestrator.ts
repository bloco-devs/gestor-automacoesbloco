import type { Conversation } from "../types/conversation";
import type { IntentClassification } from "../types/classification";
import { classifyConversation } from "../intent/intent-engine";
import { runPipeline } from "../pipelines/pipeline-runner";
import type { PipelineResult } from "../pipelines/pipeline-types";

export interface OrchestratorDecision {
  classification: IntentClassification;
  pipeline: PipelineResult;
}

/**
 * Fachada única consumida pelo AI Workspace.
 * O Workspace só conversa com o Orchestrator — NUNCA diretamente com
 * Edge Functions, Supabase ou serviços específicos.
 */
export const aiOrchestrator = {
  decide(conversation: Conversation, opts?: { suggestedSystem?: string | null }): OrchestratorDecision {
    const classification = classifyConversation(conversation, opts);
    const pipeline = runPipeline({ conversation, classification });
    return { classification, pipeline };
  },
};

export type AIOrchestrator = typeof aiOrchestrator;
