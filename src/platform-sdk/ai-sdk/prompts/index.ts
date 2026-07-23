/**
 * Prompt Registry — helpers de definição + resolução por slot.
 */
import type { AiPrompt, AiInvocationContext } from "../types";
import { aiExtensionRegistry } from "../registry";

export function definePrompt(p: Omit<AiPrompt, "kind">): AiPrompt {
  return { kind: "prompt", ...p };
}

export function findPromptBySlot(
  slot: string,
  ctx: AiInvocationContext = {}
): AiPrompt | undefined {
  const list = aiExtensionRegistry
    .prompts(slot)
    .slice()
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  const matched = list.find((p) => (p.match ? safeMatch(p.match, ctx) : true));
  if (matched) aiExtensionRegistry.recordUse("prompt", matched.id);
  return matched;
}

export function resolveFallback(prompt: AiPrompt): AiPrompt | undefined {
  if (!prompt.fallbackPromptId) return undefined;
  const all = aiExtensionRegistry.prompts();
  return all.find((p) => p.id === prompt.fallbackPromptId);
}

export function renderUserTemplate(
  prompt: AiPrompt,
  vars: Record<string, string> = {}
): string {
  if (!prompt.userTemplate) return "";
  return prompt.userTemplate.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function safeMatch(
  fn: (ctx: AiInvocationContext) => boolean,
  ctx: AiInvocationContext
): boolean {
  try {
    return !!fn(ctx);
  } catch {
    return false;
  }
}
