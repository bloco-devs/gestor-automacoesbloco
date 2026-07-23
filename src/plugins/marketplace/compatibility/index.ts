/**
 * Compatibility — verifica se um plugin é compatível com o
 * Platform SDK e o Plugin Host correntes.
 */
import type { CatalogEntry, CompatibilityReport } from "../types";

/** Versão pública do SDK/Host. Sincronizada com src/platform-sdk (FEATURE 100/101). */
export const SDK_VERSION = "1.0.0";
export const HOST_VERSION = "1.0.0";

function satisfies(current: string, required?: string): boolean {
  if (!required) return true;
  // Comparador simples: aceita "1.0.0" ou ">=1.0.0".
  const clean = required.replace(/^>=?\s*/, "");
  return current === clean || current > clean;
}

export function checkCompatibility(
  entry: CatalogEntry,
  allIds: string[]
): CompatibilityReport {
  const reasons: string[] = [];
  const missingDependencies: string[] = [];
  const missingCapabilities: string[] = [];

  const requiredSdk =
    (entry.manifest as { sdk?: string; requires?: { sdk?: string } }).sdk ??
    entry.manifest.dependencies?.find((d) => d.pluginId === "@platform/sdk")?.version;
  const requiredHost = entry.manifest.dependencies?.find(
    (d) => d.pluginId === "@platform/host"
  )?.version;

  if (!satisfies(SDK_VERSION, requiredSdk)) {
    reasons.push(`SDK ${requiredSdk} requerido, atual ${SDK_VERSION}`);
  }
  if (!satisfies(HOST_VERSION, requiredHost)) {
    reasons.push(`Host ${requiredHost} requerido, atual ${HOST_VERSION}`);
  }

  for (const dep of entry.dependencies) {
    if (dep.pluginId.startsWith("@platform/")) continue;
    if (!allIds.includes(dep.pluginId)) {
      missingDependencies.push(dep.pluginId);
      reasons.push(`Dependência ausente: ${dep.pluginId}`);
    }
  }

  // Capabilities obrigatórias (declaradas em requires) — apenas registra;
  // grant/revoke fica com a Permissions API do SDK.
  return {
    id: entry.id,
    compatible: reasons.length === 0,
    reasons,
    sdkVersion: SDK_VERSION,
    hostVersion: HOST_VERSION,
    requiredSdk,
    requiredHost,
    missingDependencies,
    missingCapabilities,
  };
}
