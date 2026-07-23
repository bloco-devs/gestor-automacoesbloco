/**
 * Workflow SDK — React hooks.
 */
import { useSyncExternalStore } from "react";
import { workflowExtensionRegistry } from "../registry";
import type { WorkflowExtension } from "../types";
import { collectWorkflowSdkDiagnostics, type WorkflowSdkDiagnostics } from "../diagnostics";

function subscribe(cb: () => void) {
  return workflowExtensionRegistry.subscribe(cb);
}

export function useWorkflowExtensions(): WorkflowExtension[] {
  return useSyncExternalStore(
    subscribe,
    () => workflowExtensionRegistry.listAll(),
    () => workflowExtensionRegistry.listAll()
  );
}

export function useWorkflowSdkDiagnostics(): WorkflowSdkDiagnostics {
  return useSyncExternalStore(
    subscribe,
    () => collectWorkflowSdkDiagnostics(),
    () => collectWorkflowSdkDiagnostics()
  );
}
