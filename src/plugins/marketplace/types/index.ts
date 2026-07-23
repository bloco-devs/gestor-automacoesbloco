/**
 * PLUGIN 002 — Marketplace types.
 * Additive only. Reutiliza tipos do Platform SDK.
 */
import type {
  PluginManifest,
  ExtensionPointId,
} from "@/platform-sdk";
import type {
  HostPluginRecord,
  HostPluginStatus,
} from "@/platform-sdk/runtime/host";

export type PluginOrigin = "bundled" | "remote";

export interface CatalogEntry {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  category: PluginManifest["category"];
  status: HostPluginStatus | "unregistered";
  origin: PluginOrigin;
  capabilitiesRequired: string[];
  capabilitiesProvided: string[];
  extensionPoints: ExtensionPointId[];
  dependencies: { pluginId: string; version?: string }[];
  commands: number;
  widgets: number;
  issues: string[];
  warnings: string[];
  record?: HostPluginRecord;
  manifest: PluginManifest;
}

export interface PluginHealth {
  id: string;
  status: HostPluginStatus | "unregistered";
  lifecycleState: "loaded" | "active" | "disabled" | "error" | "pending";
  loadTimeMs: number;
  memoryEstimateKb: number;
  commands: number;
  widgets: number;
  eventListeners: number;
  warnings: string[];
  errorCount: number;
  lastEventAt: number | null;
}

export interface CompatibilityReport {
  id: string;
  compatible: boolean;
  reasons: string[];
  sdkVersion: string;
  hostVersion: string;
  requiredSdk?: string;
  requiredHost?: string;
  missingDependencies: string[];
  missingCapabilities: string[];
}

export interface CatalogFilter {
  query?: string;
  category?: PluginManifest["category"] | "all";
  status?: HostPluginStatus | "unregistered" | "all";
  capability?: string | "all";
  extensionPoint?: ExtensionPointId | "all";
  sort?: "name" | "status" | "load" | "category";
}
