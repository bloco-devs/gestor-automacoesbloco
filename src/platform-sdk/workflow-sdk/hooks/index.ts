/**
 * Workflow SDK — React hooks.
 */
import { useSyncExternalStore } from "react";
import { workflowExtensionRegistry } from "../registry";
import type { WorkflowExtension } from "../types";
import { collectWorkflowSdkDiagnostics, type WorkflowSdkDiagnostics } from "../diagnostics";
import { stableSnapshot } from "@/lib/stable-snapshot";

function subscribe(cb: () => void) {
  return workflowExtensionRegistry.subscribe(cb);
}

const getExtensions = stableSnapshot(() => workflowExtensionRegistry.listAll());
const getDiagnostics = stableSnapshot(() => collectWorkflowSdkDiagnostics());

export function useWorkflowExtensions(): WorkflowExtension[] {
  return useSyncExternalStore(subscribe, getExtensions, getExtensions);
}

export function useWorkflowSdkDiagnostics(): WorkflowSdkDiagnostics {
  return useSyncExternalStore(subscribe, getDiagnostics, getDiagnostics);
}
