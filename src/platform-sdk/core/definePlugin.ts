import type { PluginManifest } from "../types";

/**
 * `definePlugin` — Identity helper for authoring plugins.
 * Retorna o mesmo objeto (sem side effects) para permitir type-inference
 * ergonômica no `plugin.ts` de cada módulo futuro.
 *
 * @example
 * export default definePlugin({
 *   id: "my-plugin",
 *   name: "My Plugin",
 *   version: "1.0.0",
 *   category: "workspace",
 *   commands: [...],
 *   widgets: [...],
 * })
 */
export function definePlugin<T extends PluginManifest>(manifest: T): T {
  return manifest;
}
