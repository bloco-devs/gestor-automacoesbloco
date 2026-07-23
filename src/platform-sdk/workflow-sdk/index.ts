/**
 * Workflow SDK — Public API (PLUGIN 005).
 * Aditivo. Não altera Workflow Engine/Builder/Runtime.
 */
export * from "./types";
export {
  workflowExtensionRegistry,
  WorkflowExtensionRegistry,
} from "./registry";
export type { RegistryDiagnostics } from "./registry";
export {
  workflowSdkService,
  WORKFLOW_SDK_CONTRACT,
  WORKFLOW_SDK_VERSION,
} from "./contracts";
export type { WorkflowSdkService } from "./contracts";
export {
  bootstrapWorkflowSdkProvider,
  isWorkflowSdkBootstrapped,
  __resetWorkflowSdkBootstrap,
} from "./bootstrap";
export { runAction, runTrigger, cancelRun } from "./execution";
export { runValidators } from "./validation";
export type { ValidationReport } from "./validation";
export {
  collectWorkflowSdkDiagnostics,
} from "./diagnostics";
export type { WorkflowSdkDiagnostics } from "./diagnostics";
export {
  useWorkflowExtensions,
  useWorkflowSdkDiagnostics,
} from "./hooks";
