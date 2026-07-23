/**
 * Event Automation SDK — types.
 * Aditivo: nenhum tipo do Core é alterado.
 */

export interface EventEnvelope<P = unknown> {
  id: string;
  event: string;
  payload: P;
  metadata: Record<string, unknown>;
  priority: number;
  createdAt: number;
  publisherId?: string;
  cancelled?: boolean;
  cancelReason?: string;
}

export interface EventPublisher<P = unknown> {
  kind: "publisher";
  id: string;
  pluginId: string;
  event: string;
  description?: string;
  validate?: (payload: P) => boolean | string;
  health?: () => "ok" | "degraded" | "down";
}

export interface EventSubscriber<P = unknown> {
  kind: "subscriber";
  id: string;
  pluginId: string;
  event: string;
  description?: string;
  priority?: number;
  once?: boolean;
  disabled?: boolean;
  filter?: (env: EventEnvelope<P>) => boolean;
  handler: (env: EventEnvelope<P>) => void | Promise<void>;
}

export type InterceptorDecision =
  | { type: "continue" }
  | { type: "cancel"; reason?: string }
  | { type: "rewritePayload"; payload: unknown }
  | { type: "rewriteMetadata"; metadata: Record<string, unknown> }
  | { type: "changePriority"; priority: number }
  | { type: "skipSubscriber"; subscriberId: string };

export interface EventInterceptor {
  kind: "interceptor";
  id: string;
  pluginId: string;
  event?: string; // wildcard when undefined
  priority?: number;
  intercept: (env: EventEnvelope) => InterceptorDecision | Promise<InterceptorDecision>;
}

export type MiddlewarePhase =
  | "beforePublish"
  | "beforeDispatch"
  | "beforeSubscriber"
  | "afterSubscriber"
  | "afterDispatch"
  | "afterPublish";

export interface MiddlewareContext {
  phase: MiddlewarePhase;
  env: EventEnvelope;
  subscriberId?: string;
  error?: unknown;
  rewrite: (patch: Partial<Pick<EventEnvelope, "payload" | "metadata" | "priority">>) => void;
  cancel: (reason?: string) => void;
  metrics: Record<string, number>;
}

export interface EventMiddleware {
  kind: "middleware";
  id: string;
  pluginId: string;
  phase: MiddlewarePhase | MiddlewarePhase[];
  event?: string;
  priority?: number;
  run: (ctx: MiddlewareContext, next: () => Promise<void>) => void | Promise<void>;
}

export interface EventPipeline {
  kind: "pipeline";
  id: string;
  pluginId: string;
  event: string;
  description?: string;
  steps: MiddlewarePhase[];
}

export type EventExtension =
  | EventPublisher
  | EventSubscriber
  | EventInterceptor
  | EventMiddleware
  | EventPipeline;

export type EventExtensionKind = EventExtension["kind"];

export interface DispatchResult {
  event: string;
  envelopeId: string;
  cancelled: boolean;
  cancelReason?: string;
  invoked: number;
  skipped: number;
  errors: Array<{ subscriberId: string; error: string }>;
  durationMs: number;
}
