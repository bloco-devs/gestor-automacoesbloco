/**
 * Catalog — deriva a lista de plugins conhecidos a partir do Host
 * e do registry local. Puro, sem side-effects.
 */
import type { HostDiagnostics } from "@/platform-sdk/runtime/host";
import type { PluginManifest, ExtensionPointId } from "@/platform-sdk";
import { BUNDLED_PLUGINS, originOf } from "../registry";
import type { CatalogEntry, CatalogFilter } from "../types";

function entryFromManifest(
  manifest: PluginManifest,
  diag: HostDiagnostics
): CatalogEntry {
  const record = diag.plugins.find((p) => p.id === manifest.id);
  const eps = new Set<ExtensionPointId>();
  for (const w of manifest.widgets ?? []) eps.add(w.slot);
  const validation = record?.validation;
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    author: manifest.author,
    description: manifest.description,
    category: manifest.category,
    status: record?.status ?? "unregistered",
    origin: originOf(manifest.id),
    capabilitiesRequired: manifest.permissions?.requires ?? [],
    capabilitiesProvided: manifest.permissions?.provides ?? [],
    extensionPoints: Array.from(eps),
    dependencies: manifest.dependencies ?? [],
    commands: manifest.commands?.length ?? 0,
    widgets: manifest.widgets?.length ?? 0,
    issues: validation?.errors ?? (record?.error ? [record.error] : []),
    warnings: validation?.warnings ?? [],
    record,
    manifest,
  };
}

export function buildCatalog(diag: HostDiagnostics): CatalogEntry[] {
  const seen = new Set<string>();
  const out: CatalogEntry[] = [];
  for (const b of BUNDLED_PLUGINS) {
    if (seen.has(b.manifest.id)) continue;
    seen.add(b.manifest.id);
    out.push(entryFromManifest(b.manifest, diag));
  }
  // Plugins existentes no host mas fora do registry (defensivo)
  for (const p of diag.plugins) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(entryFromManifest(p as PluginManifest, diag));
  }
  return out;
}

export function applyFilter(
  entries: CatalogEntry[],
  filter: CatalogFilter
): CatalogEntry[] {
  const q = filter.query?.trim().toLowerCase() ?? "";
  let out = entries.filter((e) => {
    if (q) {
      const hay = `${e.id} ${e.name} ${e.description ?? ""} ${e.author ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter.category && filter.category !== "all" && e.category !== filter.category)
      return false;
    if (filter.status && filter.status !== "all" && e.status !== filter.status)
      return false;
    if (filter.capability && filter.capability !== "all") {
      const caps = [...e.capabilitiesRequired, ...e.capabilitiesProvided];
      if (!caps.includes(filter.capability)) return false;
    }
    if (filter.extensionPoint && filter.extensionPoint !== "all") {
      if (!e.extensionPoints.includes(filter.extensionPoint)) return false;
    }
    return true;
  });
  const sort = filter.sort ?? "name";
  out = [...out].sort((a, b) => {
    if (sort === "status") return a.status.localeCompare(b.status);
    if (sort === "category") return a.category.localeCompare(b.category);
    if (sort === "load")
      return (b.record?.initMs ?? 0) - (a.record?.initMs ?? 0);
    return a.name.localeCompare(b.name);
  });
  return out;
}
