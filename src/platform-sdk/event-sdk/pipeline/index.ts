/**
 * Pipeline SDK — utilidades para descrever pipelines declarativas
 * de eventos. O runtime real é o Dispatcher; pipelines aqui servem
 * como documentação/inspeção para o Sandbox e Marketplace.
 */
import type { EventPipeline, MiddlewarePhase } from "../types";
import { eventExtensionRegistry } from "../registry";

export const DEFAULT_PIPELINE: MiddlewarePhase[] = [
  "beforePublish",
  "beforeDispatch",
  "beforeSubscriber",
  "afterSubscriber",
  "afterDispatch",
  "afterPublish",
];

export function definePipeline(p: Omit<EventPipeline, "kind">): EventPipeline {
  return { kind: "pipeline", ...p };
}

export function getPipelineForEvent(event: string): EventPipeline | undefined {
  return eventExtensionRegistry.pipelines().find((p) => p.event === event);
}

export function describePipeline(event: string): MiddlewarePhase[] {
  return getPipelineForEvent(event)?.steps ?? DEFAULT_PIPELINE;
}
