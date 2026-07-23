/**
 * Plugin Host Runtime — FEATURE 101.
 * API pública. Não usado pelo core; apenas por bootstrap de plugins.
 */
export { scanPlugins } from "./scanner";
export type { PluginSource, ScanResult } from "./scanner";
export { validateManifest } from "./validator";
export type { ValidationResult } from "./validator";
export { diagnoseDependencies } from "./dependency";
export type { DependencyDiagnostics } from "./dependency";
export { runLifecycle } from "./lifecycle";
export type { LifecycleEvent, LifecyclePhase, LifecycleHooks } from "./lifecycle";
export {
  PluginRenderer,
  platformRenderer,
} from "./renderer";
export type {
  RegisteredWidget,
  RegisteredCommand,
  RegisteredSidebarItem,
} from "./renderer";
export { PluginHost, pluginHost } from "./host";
export type { HostDiagnostics, HostPluginRecord, HostPluginStatus } from "./host";
export * as DeveloperAPI from "./developer";
