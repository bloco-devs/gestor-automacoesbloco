import { useSyncExternalStore } from "react";
import { pluginHost, type HostDiagnostics } from "../host";
import { platformRenderer } from "../renderer";

export function useHostDiagnostics(): HostDiagnostics {
  return useSyncExternalStore(
    (l) => pluginHost.subscribe(l),
    () => pluginHost.diagnostics(),
    () => pluginHost.diagnostics()
  );
}

export function useHostSidebarItems() {
  return useSyncExternalStore(
    (l) => platformRenderer.subscribe(l),
    () => platformRenderer.listSidebarItems(),
    () => platformRenderer.listSidebarItems()
  );
}
