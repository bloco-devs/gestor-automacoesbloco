/**
 * Skill SDK — helpers para autores de plugins.
 */
import type { AiSkill, AiInvocationContext, AiExecutionResult } from "../types";
import { aiExtensionRegistry } from "../registry";

export function defineSkill<I = unknown, O = unknown>(
  s: Omit<AiSkill<I, O>, "kind">
): AiSkill<I, O> {
  return { kind: "skill", ...s };
}

export async function runSkill<I = unknown, O = unknown>(
  id: string,
  input: I,
  ctx: AiInvocationContext = {}
): Promise<AiExecutionResult<O>> {
  const skill = aiExtensionRegistry.get("skill", id) as AiSkill<I, O> | undefined;
  if (!skill) return { ok: false, error: `skill:${id} not found` };
  if (skill.enabled === false) return { ok: false, error: `skill:${id} disabled` };
  const started = Date.now();
  try {
    aiExtensionRegistry.recordUse("skill", id);
    const r = await skill.execute(input, ctx);
    return { ...r, durationMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      error: String((err as Error)?.message ?? err),
      durationMs: Date.now() - started,
    };
  }
}
