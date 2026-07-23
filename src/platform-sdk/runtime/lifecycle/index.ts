import type { PluginManifest, PluginContext } from "../../types";

export type LifecyclePhase = "load" | "enable" | "disable" | "unload";

export interface LifecycleHooks {
  onLoad?: (ctx: PluginContext) => void | Promise<void>;
  onEnable?: (ctx: PluginContext) => void | Promise<void>;
  onDisable?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
}

export interface LifecycleEvent {
  pluginId: string;
  phase: LifecyclePhase;
  at: number;
  durationMs: number;
  error?: string;
}

/**
 * Executa um hook de forma isolada. Nunca lança.
 * Retorna evento com duração e erro (se houver).
 */
export async function runLifecycle(
  manifest: PluginManifest & LifecycleHooks,
  phase: LifecyclePhase,
  ctx: PluginContext
): Promise<LifecycleEvent> {
  const t0 = performance.now();
  const at = Date.now();
  const hook =
    phase === "load"
      ? manifest.onLoad
      : phase === "enable"
        ? manifest.onEnable ?? manifest.activate
        : phase === "disable"
          ? manifest.onDisable ?? manifest.deactivate
          : manifest.onUnload;

  if (!hook) {
    return { pluginId: manifest.id, phase, at, durationMs: 0 };
  }

  try {
    await hook(ctx);
    return { pluginId: manifest.id, phase, at, durationMs: performance.now() - t0 };
  } catch (err) {
    return {
      pluginId: manifest.id,
      phase,
      at,
      durationMs: performance.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
