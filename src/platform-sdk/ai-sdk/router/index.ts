/**
 * Prompt Router — orquestra a resolução de prompt/skill/agent a partir do contexto.
 * Estratégia:
 *   1. Executa routers customizados (registrados por plugins) ordenados por priority.
 *   2. Fallback: procura prompt cujo slot bate com módulo/rota.
 *   3. Fallback final: primeiro prompt registrado, se houver.
 */
import type {
  AiInvocationContext,
  AiPrompt,
  AiPromptResolution,
} from "../types";
import { aiExtensionRegistry } from "../registry";
import { findPromptBySlot, resolveFallback } from "../prompts";
import { selectAgentForContext } from "../agents";

function inferSlotFromContext(ctx: AiInvocationContext): string | undefined {
  if (ctx.module) return `copilot.${ctx.module}`;
  if (ctx.route) return `route:${ctx.route}`;
  return undefined;
}

export function resolveAi(
  ctx: AiInvocationContext = {}
): AiPromptResolution | null {
  // 1. Routers customizados
  const routers = aiExtensionRegistry
    .routers()
    .slice()
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  for (const r of routers) {
    try {
      aiExtensionRegistry.recordUse("router", r.id);
      const res = r.resolve(ctx);
      if (res?.prompt) return { ...res, fallbackUsed: false };
    } catch {
      /* ignore */
    }
  }

  // 2. Slot inferido
  const slot = inferSlotFromContext(ctx);
  let prompt: AiPrompt | undefined = slot ? findPromptBySlot(slot, ctx) : undefined;

  // 3. Fallback: primeiro prompt disponível
  let fallbackUsed = false;
  if (!prompt) {
    const all = aiExtensionRegistry.prompts();
    prompt = all[0];
    fallbackUsed = !!prompt;
  }

  if (!prompt) return null;

  // Fallback chain
  if (prompt.fallbackPromptId) {
    const chain = resolveFallback(prompt);
    if (chain && !prompt.systemPrompt) prompt = chain;
  }

  const agent = selectAgentForContext(ctx);
  return {
    prompt,
    agent,
    fallbackUsed,
    reason: fallbackUsed ? "fallback:first-available" : slot ? `slot:${slot}` : "router",
  };
}
