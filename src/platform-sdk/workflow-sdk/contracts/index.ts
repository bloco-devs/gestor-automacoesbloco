/**
 * Workflow SDK — contrato de mesh.
 * Additive: publica a superfície do registry como serviço no Service Mesh
 * sem alterar o mapa oficial de contratos. Consumidores usam
 * `resolve` com o contract id string; para type-safety local usamos
 * `WorkflowSdkService`.
 */
import type {
  WorkflowExtension,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
  WorkflowValidator,
  WorkflowHook,
} from "../types";
import { workflowExtensionRegistry } from "../registry";
import { collectWorkflowSdkDiagnostics, type WorkflowSdkDiagnostics } from "../diagnostics";

export const WORKFLOW_SDK_CONTRACT = "service.workflow-sdk" as const;
export const WORKFLOW_SDK_VERSION = "1.0.0";

export interface WorkflowSdkService {
  readonly kind: "workflow-sdk";
  register(ext: WorkflowExtension): () => void;
  registerAll(exts: WorkflowExtension[]): () => void;
  removePlugin(pluginId: string): number;
  triggers(): WorkflowTrigger[];
  conditions(): WorkflowCondition[];
  actions(): WorkflowAction[];
  validators(): WorkflowValidator[];
  hooks(): WorkflowHook[];
  diagnostics(): WorkflowSdkDiagnostics;
}

export const workflowSdkService: WorkflowSdkService = {
  kind: "workflow-sdk",
  register: (ext) => workflowExtensionRegistry.register(ext),
  registerAll: (exts) => workflowExtensionRegistry.registerAll(exts),
  removePlugin: (id) => workflowExtensionRegistry.removePlugin(id),
  triggers: () => workflowExtensionRegistry.triggers(),
  conditions: () => workflowExtensionRegistry.conditions(),
  actions: () => workflowExtensionRegistry.actions(),
  validators: () => workflowExtensionRegistry.validators(),
  hooks: () => workflowExtensionRegistry.hooks(),
  diagnostics: () => collectWorkflowSdkDiagnostics(),
};
