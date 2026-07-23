/**
 * Bootstrap — publica o WorkflowSdkService no Service Mesh como
 * um provider do plugin "platform.core". Aditivo: usa um id de
 * contrato próprio (`service.workflow-sdk`) sem alterar o mapa
 * oficial. Consumidores externos podem resolver via cast.
 *
 * Idempotente.
 */
import { serviceRegistry } from "../../services/registry/registry";
import { recordMeshEvent } from "../../services/diagnostics";
import {
  WORKFLOW_SDK_CONTRACT,
  WORKFLOW_SDK_VERSION,
  workflowSdkService,
} from "../contracts";

const PROVIDER_ID = "platform.core.workflow-sdk";
let bootstrapped = false;

export function bootstrapWorkflowSdkProvider() {
  if (bootstrapped) return;
  serviceRegistry.register({
    id: PROVIDER_ID,
    pluginId: "platform.core",
    // Cast: WorkflowSdkService não está no ServiceContractMap oficial (aditivo).
    contract: WORKFLOW_SDK_CONTRACT as unknown as never,
    version: WORKFLOW_SDK_VERSION,
    visibility: "public",
    impl: workflowSdkService as unknown as never,
  });
  recordMeshEvent({
    kind: "provider.registered",
    pluginId: "platform.core",
    serviceId: PROVIDER_ID,
    contract: WORKFLOW_SDK_CONTRACT,
    detail: `v${WORKFLOW_SDK_VERSION} · public`,
  });
  bootstrapped = true;
}

export function isWorkflowSdkBootstrapped() {
  return bootstrapped;
}

export function __resetWorkflowSdkBootstrap() {
  serviceRegistry.unregister(PROVIDER_ID);
  bootstrapped = false;
}
