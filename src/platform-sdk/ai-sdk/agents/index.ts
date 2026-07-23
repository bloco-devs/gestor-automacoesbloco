/**
 * Agent SDK — helpers e execução.
 */
import type { AiAgent, AiInvocationContext, AiExecutionResult } from "../types";
import { aiExtensionRegistry } from "../registry";

export function defineAgent(a: Omit<AiAgent, "kind">): AiAgent {
  return { kind: "agent", ...a };
}

export async function runAgent(
  id: string,
  input: string,
  ctx: AiInvocationContext = {}
): Promise<AiExecutionResult> {
  const agent = aiExtensionRegistry.get("agent", id);
  if (!agent) return { ok: false, error: `agent:${id} not found` };
  const started = Date.now();
  try {
    aiExtensionRegistry.recordUse("agent", id);
    const r = await agent.execute(input, ctx);
    return { ...r, durationMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      error: String((err as Error)?.message ?? err),
      durationMs: Date.now() - started,
    };
  }
}

export function selectAgentForContext(ctx: AiInvocationContext): AiAgent | undefined {
  const all = aiExtensionRegistry.agents();
  return all
    .slice()
    .sort(
      (a, b) =>
        (a.routingPolicy?.priority ?? 100) - (b.routingPolicy?.priority ?? 100)
    )
    .find((a) => {
      const pol = a.routingPolicy;
      if (!pol) return true;
      if (pol.modules && ctx.module && !pol.modules.includes(ctx.module)) return false;
      return true;
    });
}
