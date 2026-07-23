/**
 * Bootstrap — publica AiOrchestratorService no Service Mesh.
 * Aditivo e idempotente.
 */
import { serviceRegistry } from "../../services/registry/registry";
import { recordMeshEvent } from "../../services/diagnostics";
import {
  AI_ORCHESTRATOR_CONTRACT,
  AI_ORCHESTRATOR_VERSION,
  aiOrchestratorService,
} from "../contracts";

const PROVIDER_ID = "platform.core.ai-orchestrator";
let bootstrapped = false;

export function bootstrapAiOrchestratorProvider() {
  if (bootstrapped) return;
  serviceRegistry.register({
    id: PROVIDER_ID,
    pluginId: "platform.core",
    contract: AI_ORCHESTRATOR_CONTRACT as unknown as never,
    version: AI_ORCHESTRATOR_VERSION,
    visibility: "public",
    impl: aiOrchestratorService as unknown as never,
  });
  recordMeshEvent({
    kind: "provider.registered",
    pluginId: "platform.core",
    serviceId: PROVIDER_ID,
    contract: AI_ORCHESTRATOR_CONTRACT,
    detail: `v${AI_ORCHESTRATOR_VERSION} · public`,
  });
  bootstrapped = true;
}

export function isAiOrchestratorBootstrapped() {
  return bootstrapped;
}

export function __resetAiOrchestratorBootstrap() {
  serviceRegistry.unregister(PROVIDER_ID);
  bootstrapped = false;
}
