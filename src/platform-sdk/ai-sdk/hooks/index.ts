import { useEffect, useState } from "react";
import { aiExtensionRegistry } from "../registry";
import { collectAiSdkDiagnostics, type AiSdkDiagnostics } from "../diagnostics";

export function useAiExtensions() {
  const [snap, setSnap] = useState(() => aiExtensionRegistry.listAll());
  useEffect(
    () => aiExtensionRegistry.subscribe(() => setSnap(aiExtensionRegistry.listAll())),
    []
  );
  return snap;
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
