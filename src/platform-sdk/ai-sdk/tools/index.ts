/**
 * Tool SDK — helpers e runner.
 */
import type { AiTool, AiInvocationContext, AiExecutionResult } from "../types";
import { aiExtensionRegistry } from "../registry";

export function defineTool<I = unknown, O = unknown>(
  t: Omit<AiTool<I, O>, "kind">
): AiTool<I, O> {
  return { kind: "tool", ...t };
}

export async function runTool<I = unknown, O = unknown>(
  id: string,
  input: I,
  ctx: AiInvocationContext = {}
): Promise<AiExecutionResult<O>> {
  const tool = aiExtensionRegistry.get("tool", id) as AiTool<I, O> | undefined;
  if (!tool) return { ok: false, error: `tool:${id} not found` };
  const started = Date.now();
  try {
    aiExtensionRegistry.recordUse("tool", id);
    const r = await tool.execute(input, ctx);
    return { ...r, durationMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      error: String((err as Error)?.message ?? err),
      durationMs: Date.now() - started,
    };
  }
}
