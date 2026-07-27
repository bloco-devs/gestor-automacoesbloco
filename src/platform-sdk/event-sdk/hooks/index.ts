/**
 * React hooks — usam apenas o registry/diagnostics (sem depender do Core).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { stableSnapshot } from "@/lib/stable-snapshot";
import { eventExtensionRegistry } from "../registry";
import {
  collectEventSdkDiagnostics,
  type EventSdkDiagnostics,
} from "../diagnostics";

const getEventExtensionsSnapshot = stableSnapshot(() => eventExtensionRegistry.listAll());

function subscribeEventRegistry(listener: () => void) {
  return eventExtensionRegistry.subscribe(listener);
}

export function useEventExtensions() {
  return useSyncExternalStore(subscribeEventRegistry, getEventExtensionsSnapshot, getEventExtensionsSnapshot);
}

export function useEventSdkDiagnostics(intervalMs = 2000): EventSdkDiagnostics {
  const [diag, setDiag] = useState(() => collectEventSdkDiagnostics());
  useEffect(() => {
    const unsub = eventExtensionRegistry.subscribe(() =>
      setDiag(collectEventSdkDiagnostics())
    );
    const t = setInterval(() => setDiag(collectEventSdkDiagnostics()), intervalMs);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, [intervalMs]);
  return diag;
}
