import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { pluginRegistry } from "../core/registry";
import { platformBus } from "../events/eventBus";
import type {
  ExtensionPointId,
  PlatformEventMap,
  PlatformEventName,
  PluginRecord,
} from "../types";

function subscribeRegistry(cb: () => void) {
  return pluginRegistry.subscribe(cb);
}

export function usePlugins(): PluginRecord[] {
  return useSyncExternalStore(
    subscribeRegistry,
    () => pluginRegistry.list(),
    () => pluginRegistry.list()
  );
}

export function useExtensionPoint(slot: ExtensionPointId) {
  return useSyncExternalStore(
    subscribeRegistry,
    () => pluginRegistry.widgets(slot),
    () => pluginRegistry.widgets(slot)
  );
}

export function usePluginCommands() {
  return useSyncExternalStore(
    subscribeRegistry,
    () => pluginRegistry.commands(),
    () => pluginRegistry.commands()
  );
}

export function usePlatformEvent<K extends PlatformEventName>(
  name: K,
  handler: (payload: PlatformEventMap[K]) => void
) {
  useEffect(() => platformBus.on(name, handler), [name, handler]);
}

export function useEmitPlatformEvent() {
  return useCallback(
    <K extends PlatformEventName>(name: K, payload: PlatformEventMap[K]) =>
      platformBus.emit(name, payload),
    []
  );
}

export function useEventHistory() {
  const [snapshot, setSnapshot] = useState(() => platformBus.history());
  useEffect(() => {
    const id = window.setInterval(() => setSnapshot(platformBus.history()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return snapshot;
}
