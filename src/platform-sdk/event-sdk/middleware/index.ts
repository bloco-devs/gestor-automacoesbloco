/**
 * Middleware pipeline — Express-like `ctx / next / cancel / rewrite`.
 * Executa middlewares filtrados por fase e evento, em ordem de priority.
 */
import type {
  EventEnvelope,
  MiddlewareContext,
  MiddlewarePhase,
} from "../types";
import { eventExtensionRegistry } from "../registry";

export async function runMiddleware(
  phase: MiddlewarePhase,
  env: EventEnvelope,
  subscriberId?: string
): Promise<void> {
  const list = eventExtensionRegistry
    .middlewares(env.event)
    .filter((m) => {
      const p = Array.isArray(m.phase) ? m.phase : [m.phase];
      return p.includes(phase);
    })
    .slice()
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

  if (list.length === 0) return;

  const metrics: Record<string, number> = {};

  let i = -1;
  const invoke = async (idx: number): Promise<void> => {
    if (idx <= i) return; // guard double next()
    i = idx;
    const mw = list[idx];
    if (!mw) return;
    const ctx: MiddlewareContext = {
      phase,
      env,
      subscriberId,
      metrics,
      rewrite: (patch) => {
        if (patch.payload !== undefined) env.payload = patch.payload;
        if (patch.metadata) env.metadata = { ...env.metadata, ...patch.metadata };
        if (typeof patch.priority === "number") env.priority = patch.priority;
      },
      cancel: (reason) => {
        env.cancelled = true;
        env.cancelReason = reason ?? `middleware:${mw.id}`;
      },
    };
    try {
      await mw.run(ctx, () => invoke(idx + 1));
    } catch (err) {
      metrics[`error:${mw.id}`] = (metrics[`error:${mw.id}`] ?? 0) + 1;
      // continue chain
      await invoke(idx + 1);
      void err;
    }
  };

  await invoke(0);
}
