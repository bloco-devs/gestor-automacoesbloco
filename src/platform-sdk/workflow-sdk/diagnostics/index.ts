/**
 * Workflow SDK Diagnostics — snapshot puro do registry.
 */
import { workflowExtensionRegistry } from "../registry";
import type { WorkflowExtension, WorkflowExtensionKind } from "../types";

export interface WorkflowSdkDiagnostics {
  generatedAt: number;
  total: number;
  byKind: Record<WorkflowExtensionKind, number>;
  byPlugin: Record<string, number>;
  extensions: {
    id: string;
    kind: WorkflowExtensionKind;
    name: string;
    pluginId: string;
    category?: string;
    version?: string;
  }[];
}

export function collectWorkflowSdkDiagnostics(): WorkflowSdkDiagnostics {
  const all: WorkflowExtension[] = workflowExtensionRegistry.listAll();
  const diag = workflowExtensionRegistry.diagnostics();
  return {
    generatedAt: Date.now(),
    total: diag.total,
    byKind: diag.byKind,
    byPlugin: diag.byPlugin,
    extensions: all.map((e) => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      pluginId: e.pluginId,
      category: e.category,
      version: e.version,
    })),
  };
}
