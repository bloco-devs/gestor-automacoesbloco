/**
 * React hooks — usam apenas o registry/diagnostics (sem depender do Core).
 */
import { useEffect, useState } from "react";
import { eventExtensionRegistry } from "../registry";
import {
  collectEventSdkDiagnostics,
  type EventSdkDiagnostics,
} from "../diagnostics";

export function useEventExtensions() {
  const [snapshot, setSnapshot] = useState(() =>
    eventExtensionRegistry.listAll()
  );
  useEffect(() => {
    return eventExtensionRegistry.subscribe(() => {
      setSnapshot(eventExtensionRegistry.listAll());
    });
  }, []);
  return snapshot;
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
