/**
 * Bootstrap — publica AiSdkService no Service Mesh como provider `platform.core`.
 * Aditivo e idempotente. Não altera contratos existentes.
 */
import { serviceRegistry } from "../../services/registry/registry";
import { recordMeshEvent } from "../../services/diagnostics";
import { AI_SDK_CONTRACT, AI_SDK_VERSION, aiSdkService } from "../contracts";

const PROVIDER_ID = "platform.core.ai-sdk";
let bootstrapped = false;

export function bootstrapAiSdkProvider() {
  if (bootstrapped) return;
  serviceRegistry.register({
    id: PROVIDER_ID,
    pluginId: "platform.core",
    contract: AI_SDK_CONTRACT as unknown as never,
    version: AI_SDK_VERSION,
    visibility: "public",
    impl: aiSdkService as unknown as never,
  });
  recordMeshEvent({
    kind: "provider.registered",
    pluginId: "platform.core",
    serviceId: PROVIDER_ID,
    contract: AI_SDK_CONTRACT,
    detail: `v${AI_SDK_VERSION} · public`,
  });
  bootstrapped = true;
}

export function isAiSdkBootstrapped() {
  return bootstrapped;
}

export function __resetAiSdkBootstrap() {
  serviceRegistry.unregister(PROVIDER_ID);
  bootstrapped = false;
}
