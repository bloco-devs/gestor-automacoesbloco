/**
 * Platform SDK — Public API (FEATURE 100).
 * Estável. Consumido apenas por plugins futuros e pelo host.
 */
export * from "./types";
export { definePlugin } from "./core/definePlugin";
export { pluginRegistry } from "./core/registry";
export { resolveDependencies } from "./core/dependency-resolver";
export { platformBus, createEventBus, emit } from "./events/eventBus";
export { platformPermissions, createPermissions } from "./permissions/permissions";
export {
  usePlugins,
  useExtensionPoint,
  usePluginCommands,
  usePlatformEvent,
  useEmitPlatformEvent,
  useEventHistory,
} from "./hooks";
export * from "./services";
export const EXTENSION_POINTS = [
  "sidebar",
  "dashboard",
  "workspace",
  "portal",
  "operations",
  "analytics",
  "admin",
  "commandPalette",
  "contextPanel",
  "copilot",
] as const;
