/**
 * Context Builder SDK — compõe payload contextual por escopo.
 */
import type { AiContextBuilder, AiInvocationContext } from "../types";
import { aiExtensionRegistry } from "../registry";

export function defineContextBuilder(
  b: Omit<AiContextBuilder, "kind">
): AiContextBuilder {
  return { kind: "context-builder", ...b };
}

export async function buildContext(
  scope: string,
  ctx: AiInvocationContext = {}
): Promise<Record<string, unknown>> {
  const builders = aiExtensionRegistry.contextBuilders(scope);
  const out: Record<string, unknown> = {};
  for (const b of builders) {
    try {
      aiExtensionRegistry.recordUse("context-builder", b.id);
      const part = await b.build(ctx);
      Object.assign(out, part ?? {});
    } catch {
      /* nunca lança */
    }
  }
  return out;
}

export async function buildScopes(
  scopes: string[],
  ctx: AiInvocationContext = {}
): Promise<Record<string, Record<string, unknown>>> {
  const acc: Record<string, Record<string, unknown>> = {};
  for (const s of scopes) acc[s] = await buildContext(s, ctx);
  return acc;
}
