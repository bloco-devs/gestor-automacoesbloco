import type { Conversation } from "../types/conversation";
import type { IntentDefinition, IntentId } from "./intent-types";
import { listIntents } from "./intent-registry";

export interface ResolverMatch {
  intent: IntentId;
  score: number;
  keywords: string[];
  definition: IntentDefinition;
}

/**
 * Concatena as mensagens do usuário em um único texto normalizado.
 */
export function flattenUserText(conversation: Conversation): string {
  return conversation
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n")
    .toLowerCase();
}

/**
 * Resolver heurístico determinístico — sem chamadas de rede.
 * Cada match de keyword vale 1 ponto; cada regex vale 2.
 */
export function resolveIntent(conversation: Conversation): ResolverMatch {
  const text = flattenUserText(conversation);
  const matches: ResolverMatch[] = [];

  for (const def of listIntents()) {
    if (def.id === "UNKNOWN") continue;
    const hits: string[] = [];
    let score = 0;
    for (const kw of def.keywords) {
      if (text.includes(kw)) {
        score += 1;
        hits.push(kw);
      }
    }
    for (const rx of def.patterns ?? []) {
      if (rx.test(text)) score += 2;
    }
    if (score > 0) matches.push({ intent: def.id, score, keywords: hits, definition: def });
  }

  if (matches.length === 0) {
    const unknown = listIntents().find((d) => d.id === "UNKNOWN")!;
    return { intent: "UNKNOWN", score: 0, keywords: [], definition: unknown };
  }

  matches.sort((a, b) => b.score - a.score);
  return matches[0];
}

/**
 * Confiança em [0,1] normalizada logaritmicamente pelo score bruto.
 */
export function scoreToConfidence(rawScore: number): number {
  if (rawScore <= 0) return 0;
  // 1 hit ~ 0.55, 2 hits ~ 0.72, 4 hits ~ 0.88, 6+ hits ~ 0.95
  return Math.min(0.98, 0.4 + Math.log2(rawScore + 1) * 0.22);
}
