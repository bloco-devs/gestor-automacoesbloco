/**
 * Dispatcher — orquestra o ciclo completo de publicação de eventos:
 * beforePublish → interceptors → beforeDispatch →
 *   (por subscriber ordenado por priority)
 *     beforeSubscriber → handler → afterSubscriber
 * afterDispatch → afterPublish.
 *
 * Nunca lança: erros são coletados em `DispatchResult`.
 */
import type {
  DispatchResult,
  EventEnvelope,
  EventSubscriber,
  MiddlewarePhase,
} from "../types";
import { eventExtensionRegistry } from "../registry";
import { runMiddleware } from "../middleware";
import { recordEvent, recordDispatch } from "../diagnostics";

let seq = 0;

function nextId(event: string) {
  seq += 1;
  return `evt_${event}_${Date.now().toString(36)}_${seq}`;
}

export interface DispatchOptions {
  metadata?: Record<string, unknown>;
  priority?: number;
  publisherId?: string;
}

export async function dispatchEvent<P = unknown>(
  event: string,
  payload: P,
  opts: DispatchOptions = {}
): Promise<DispatchResult> {
  const started = Date.now();
  const env: EventEnvelope<P> = {
    id: nextId(event),
    event,
    payload,
    metadata: { ...(opts.metadata ?? {}) },
    priority: opts.priority ?? 100,
    createdAt: started,
    publisherId: opts.publisherId,
  };

  const result: DispatchResult = {
    event,
    envelopeId: env.id,
    cancelled: false,
    invoked: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  const skipSet = new Set<string>();

  const runPhase = async (phase: MiddlewarePhase, subscriberId?: string) => {
    if (env.cancelled) return;
    await runMiddleware(phase, env as EventEnvelope, subscriberId);
  };

  try {
    await runPhase("beforePublish");
    if (env.cancelled) return finalize(result, env, started);

    // Interceptors (only pre-dispatch)
    const interceptors = eventExtensionRegistry
      .interceptors(event)
      .slice()
      .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    for (const it of interceptors) {
      try {
        const decision = await it.intercept(env as EventEnvelope);
        switch (decision.type) {
          case "cancel":
            env.cancelled = true;
            env.cancelReason = decision.reason ?? `interceptor:${it.id}`;
            break;
          case "rewritePayload":
            (env as EventEnvelope).payload = decision.payload;
            break;
          case "rewriteMetadata":
            env.metadata = { ...env.metadata, ...decision.metadata };
            break;
          case "changePriority":
            env.priority = decision.priority;
            break;
          case "skipSubscriber":
            skipSet.add(decision.subscriberId);
            break;
          case "continue":
          default:
            break;
        }
        if (env.cancelled) break;
      } catch (err) {
        result.errors.push({
          subscriberId: `interceptor:${it.id}`,
          error: String((err as Error)?.message ?? err),
        });
      }
    }
    if (env.cancelled) return finalize(result, env, started);

    await runPhase("beforeDispatch");
    if (env.cancelled) return finalize(result, env, started);

    // Subscribers
    const subs: EventSubscriber[] = eventExtensionRegistry
      .subscribers(event)
      .filter((s) => !s.disabled && !skipSet.has(s.id))
      .slice()
      .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    const onceIds: string[] = [];
    for (const s of subs) {
      if (env.cancelled) break;
      if (s.filter) {
        try {
          if (!s.filter(env as EventEnvelope)) {
            result.skipped++;
            continue;
          }
        } catch {
          result.skipped++;
          continue;
        }
      }
      await runPhase("beforeSubscriber", s.id);
      if (env.cancelled) break;
      try {
        await s.handler(env as EventEnvelope);
        result.invoked++;
        if (s.once) onceIds.push(s.id);
      } catch (err) {
        result.errors.push({
          subscriberId: s.id,
          error: String((err as Error)?.message ?? err),
        });
      }
      await runPhase("afterSubscriber", s.id);
    }

    for (const id of onceIds) eventExtensionRegistry.unregister("subscriber", id);

    await runPhase("afterDispatch");
    await runPhase("afterPublish");
  } catch (err) {
    result.errors.push({
      subscriberId: "dispatcher",
      error: String((err as Error)?.message ?? err),
    });
  }

  return finalize(result, env, started);
}

function finalize(
  result: DispatchResult,
  env: EventEnvelope,
  started: number
): DispatchResult {
  result.cancelled = !!env.cancelled;
  result.cancelReason = env.cancelReason;
  result.durationMs = Date.now() - started;
  recordEvent(env);
  recordDispatch(result);
  return result;
}
