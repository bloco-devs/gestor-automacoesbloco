/**
 * Bootstrap — publica o EventSdkService no Service Mesh como provider
 * do plugin "platform.core". Aditivo, idempotente.
 */
import { serviceRegistry } from "../../services/registry/registry";
import { recordMeshEvent } from "../../services/diagnostics";
import {
  EVENT_SDK_CONTRACT,
  EVENT_SDK_VERSION,
  eventSdkService,
} from "../contracts";

const PROVIDER_ID = "platform.core.event-sdk";
let bootstrapped = false;

export function bootstrapEventSdkProvider() {
  if (bootstrapped) return;
  serviceRegistry.register({
    id: PROVIDER_ID,
    pluginId: "platform.core",
    contract: EVENT_SDK_CONTRACT as unknown as never,
    version: EVENT_SDK_VERSION,
    visibility: "public",
    impl: eventSdkService as unknown as never,
  });
  recordMeshEvent({
    kind: "provider.registered",
    pluginId: "platform.core",
    serviceId: PROVIDER_ID,
    contract: EVENT_SDK_CONTRACT,
    detail: `v${EVENT_SDK_VERSION} · public`,
  });
  bootstrapped = true;
}

export function isEventSdkBootstrapped() {
  return bootstrapped;
}

export function __resetEventSdkBootstrap() {
  serviceRegistry.unregister(PROVIDER_ID);
  bootstrapped = false;
}
