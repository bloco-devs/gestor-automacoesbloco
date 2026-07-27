import { useEffect, useState, useSyncExternalStore } from "react";
import { stableSnapshot } from "@/lib/stable-snapshot";
import { aiExtensionRegistry } from "../registry";
import { collectAiSdkDiagnostics, type AiSdkDiagnostics } from "../diagnostics";

const getAiExtensionsSnapshot = stableSnapshot(() => aiExtensionRegistry.listAll());

function subscribeAiRegistry(listener: () => void) {
  return aiExtensionRegistry.subscribe(listener);
}

export function useAiExtensions() {
  return useSyncExternalStore(subscribeAiRegistry, getAiExtensionsSnapshot, getAiExtensionsSnapshot);
}

export function useAiSdkDiagnostics(intervalMs = 2000): AiSdkDiagnostics {
  const [d, setD] = useState(() => collectAiSdkDiagnostics());
  useEffect(() => {
    const unsub = aiExtensionRegistry.subscribe(() =>
      setD(collectAiSdkDiagnostics())
    );
    const t = setInterval(() => setD(collectAiSdkDiagnostics()), intervalMs);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, [intervalMs]);
  return d;
}
