/**
 * Event SDK — mesh contract.
 * Aditivo: publica a superfície do registry + dispatcher como serviço,
 * sem alterar o mapa oficial de contratos do Service Mesh.
 */
import type {
  DispatchOptions,
} from "../dispatcher";
import { dispatchEvent } from "../dispatcher";
import type {
  DispatchResult,
  EventExtension,
  EventInterceptor,
  EventMiddleware,
  EventPipeline,
  EventPublisher,
  EventSubscriber,
} from "../types";
import { eventExtensionRegistry } from "../registry";
import {
  collectEventSdkDiagnostics,
  type EventSdkDiagnostics,
} from "../diagnostics";
import { describePipeline } from "../pipeline";

export const EVENT_SDK_CONTRACT = "service.event-sdk" as const;
export const EVENT_SDK_VERSION = "1.0.0";

export interface EventSdkService {
  readonly kind: "event-sdk";
  register(ext: EventExtension): () => void;
  registerAll(exts: EventExtension[]): () => void;
  removePlugin(pluginId: string): number;
  publish<P = unknown>(
    event: string,
    payload: P,
    opts?: DispatchOptions
  ): Promise<DispatchResult>;
  publishers(): EventPublisher[];
  subscribers(event?: string): EventSubscriber[];
  interceptors(event?: string): EventInterceptor[];
  middlewares(event?: string): EventMiddleware[];
  pipelines(): EventPipeline[];
  describePipeline(event: string): ReturnType<typeof describePipeline>;
  diagnostics(): EventSdkDiagnostics;
}

export const eventSdkService: EventSdkService = {
  kind: "event-sdk",
  register: (ext) => eventExtensionRegistry.register(ext),
  registerAll: (exts) => eventExtensionRegistry.registerAll(exts),
  removePlugin: (id) => eventExtensionRegistry.removePlugin(id),
  publish: (event, payload, opts) => dispatchEvent(event, payload, opts),
  publishers: () => eventExtensionRegistry.publishers(),
  subscribers: (event) => eventExtensionRegistry.subscribers(event),
  interceptors: (event) => eventExtensionRegistry.interceptors(event),
  middlewares: (event) => eventExtensionRegistry.middlewares(event),
  pipelines: () => eventExtensionRegistry.pipelines(),
  describePipeline: (event) => describePipeline(event),
  diagnostics: () => collectEventSdkDiagnostics(),
};
