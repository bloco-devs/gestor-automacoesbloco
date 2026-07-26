import { useSyncExternalStore } from "react";
import { pluginHost, type HostDiagnostics } from "../host";
import { platformRenderer } from "../renderer";
import { stableSnapshot } from "@/lib/stable-snapshot";

const getDiagnostics = stableSnapshot(() => pluginHost.diagnostics());
const getSidebarItems = stableSnapshot(() => platformRenderer.listSidebarItems());

export function useHostDiagnostics(): HostDiagnostics {
  return useSyncExternalStore(
    (l) => pluginHost.subscribe(l),
    getDiagnostics,
    getDiagnostics,
  );
}

export function useHostSidebarItems() {
  return useSyncExternalStore(
    (l) => platformRenderer.subscribe(l),
    getSidebarItems,
    getSidebarItems,
  );
}
