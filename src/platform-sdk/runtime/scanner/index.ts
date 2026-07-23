import type { PluginManifest } from "../../types";

/**
 * Plugin Scanner — descoberta de plugins.
 * FEATURE 101: implementação estática. Recebe uma lista de manifests
 * fornecida pelo bootstrap. Preparado para futuramente aceitar
 * dynamic imports (`() => import("...")`).
 */
export type PluginSource = PluginManifest | (() => Promise<{ default: PluginManifest }>);

export interface ScanResult {
  manifests: PluginManifest[];
  errors: { source: string; message: string }[];
  scannedAt: number;
  durationMs: number;
}

export async function scanPlugins(sources: PluginSource[]): Promise<ScanResult> {
  const t0 = performance.now();
  const manifests: PluginManifest[] = [];
  const errors: ScanResult["errors"] = [];

  for (const source of sources) {
    try {
      if (typeof source === "function") {
        const mod = await source();
        if (!mod?.default) {
          errors.push({ source: "dynamic", message: "Missing default export" });
          continue;
        }
        manifests.push(mod.default);
      } else {
        manifests.push(source);
      }
    } catch (err) {
      errors.push({
        source: "dynamic",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    manifests,
    errors,
    scannedAt: Date.now(),
    durationMs: performance.now() - t0,
  };
}
