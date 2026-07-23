/**
 * Event Automation SDK — public entry.
 * Aditivo. Nunca importa módulos do Core (fora do próprio platform-sdk).
 */
export * from "./types";
export {
  eventExtensionRegistry,
  EventExtensionRegistry,
  type EventRegistryDiagnostics,
} from "./registry";
export { dispatchEvent, type DispatchOptions } from "./dispatcher";
export { runMiddleware } from "./middleware";
export {
  definePipeline,
  describePipeline,
  DEFAULT_PIPELINE,
  getPipelineForEvent,
} from "./pipeline";
export {
  collectEventSdkDiagnostics,
  type EventSdkDiagnostics,
  __resetEventSdkDiagnostics,
} from "./diagnostics";
export {
  EVENT_SDK_CONTRACT,
  EVENT_SDK_VERSION,
  eventSdkService,
  type EventSdkService,
} from "./contracts";
export {
  bootstrapEventSdkProvider,
  isEventSdkBootstrapped,
  __resetEventSdkBootstrap,
} from "./bootstrap";
export { useEventExtensions, useEventSdkDiagnostics } from "./hooks";
