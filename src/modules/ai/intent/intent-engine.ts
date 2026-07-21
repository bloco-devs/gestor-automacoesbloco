import type { Conversation } from "../types/conversation";
import type { IntentClassification } from "../types/classification";
import { resolveIntent, scoreToConfidence } from "./intent-resolver";

/**
 * Núcleo do Intent Engine — sem side-effects, sem I/O.
 * Classifica a conversa e devolve as decisões operacionais.
 */
export function classifyConversation(
  conversation: Conversation,
  opts?: { suggestedSystem?: string | null },
): IntentClassification {
  const match = resolveIntent(conversation);
  const def = match.definition;
  const confidence = match.intent === "UNKNOWN" ? 0.2 : scoreToConfidence(match.score);

  return {
    intent: def.id,
    confidence,
    pipeline: def.pipeline,
    shouldCreateTicket: def.shouldCreateTicket,
    shouldAskQuestion: def.shouldAskQuestion,
    shouldSearchKnowledge: def.shouldSearchKnowledge,
    shouldRespondImmediately: def.shouldRespondImmediately,
    suggestedPriority: def.suggestedPriority,
    suggestedCategory: def.suggestedCategory,
    suggestedSystem: opts?.suggestedSystem ?? null,
    matchedKeywords: match.keywords,
  };
}
