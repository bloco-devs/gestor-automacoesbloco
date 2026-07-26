import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { pluginRegistry } from "../core/registry";
import { platformBus } from "../events/eventBus";
import { stableSnapshot } from "@/lib/stable-snapshot";
import type {
  ExtensionPointId,
  PlatformEventMap,
  PlatformEventName,
  PluginRecord,
} from "../types";

function subscribeRegistry(cb: () => void) {
  return pluginRegistry.subscribe(cb);
}

const getPlugins = stableSnapshot(() => pluginRegistry.list());
const getCommands = stableSnapshot(() => pluginRegistry.commands());

const widgetSnapshots = new Map<ExtensionPointId, () => ReturnType<typeof pluginRegistry.widgets>>();
function getWidgetsSnapshot(slot: ExtensionPointId) {
  let fn = widgetSnapshots.get(slot);
  if (!fn) {
    fn = stableSnapshot(() => pluginRegistry.widgets(slot));
    widgetSnapshots.set(slot, fn);
  }
  return fn;
}

export function usePlugins(): PluginRecord[] {
  return useSyncExternalStore(subscribeRegistry, getPlugins, getPlugins);
}

export function useExtensionPoint(slot: ExtensionPointId) {
  const snapshot = getWidgetsSnapshot(slot);
  return useSyncExternalStore(subscribeRegistry, snapshot, snapshot);
}

export function usePluginCommands() {
  return useSyncExternalStore(subscribeRegistry, getCommands, getCommands);
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
