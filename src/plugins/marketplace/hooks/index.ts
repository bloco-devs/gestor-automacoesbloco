import { useEffect, useMemo, useState } from "react";
import { pluginHost } from "@/platform-sdk/runtime";
import { useHostDiagnostics } from "@/platform-sdk/runtime/hooks";
import { bundledSources } from "../registry";
import { applyFilter, buildCatalog } from "../catalog";
import { computeHealth } from "../diagnostics";
import { checkCompatibility } from "../compatibility";
import type { CatalogEntry, CatalogFilter } from "../types";

/**
 * Boot idempotente: garante que o Host tem os plugins bundled inicializados.
 * Se o SdkSandbox já inicializou, este hook é no-op.
 */
export function useMarketplaceBoot() {
  const diag = useHostDiagnostics();
  const [booting, setBooting] = useState(!diag.initializedAt);
  useEffect(() => {
    if (diag.initializedAt) {
      setBooting(false);
      return;
    }
    let cancelled = false;
    pluginHost.initialize(bundledSources()).finally(() => {
      if (!cancelled) setBooting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [diag.initializedAt]);
  return booting;
}

export function useCatalog(filter: CatalogFilter = {}) {
  const diag = useHostDiagnostics();
  return useMemo(() => {
    const catalog = buildCatalog(diag);
    return {
      diag,
      all: catalog,
      filtered: applyFilter(catalog, filter),
    };
  }, [diag, filter]);
}

export function usePluginHealth(entry: CatalogEntry | null | undefined) {
  const diag = useHostDiagnostics();
  return useMemo(() => (entry ? computeHealth(entry, diag) : null), [entry, diag]);
}

export function useCompatibility(entry: CatalogEntry | null | undefined) {
  const diag = useHostDiagnostics();
  return useMemo(() => {
    if (!entry) return null;
    const allIds = diag.plugins.map((p) => p.id);
    return checkCompatibility(entry, allIds);
  }, [entry, diag]);
}
