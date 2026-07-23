/**
 * Platform SDK — Types
 * FEATURE 100. Additive. Núcleo permanece intacto.
 */
import type { ComponentType, ReactNode } from "react";

export type PluginStatus = "registered" | "active" | "disabled" | "error";

export type PluginCategory =
  | "portal"
  | "workspace"
  | "operations"
  | "analytics"
  | "admin"
  | "knowledge"
  | "ai"
  | "integration"
  | "misc";

export type ExtensionPointId =
  | "sidebar"
  | "dashboard"
  | "workspace"
  | "portal"
  | "operations"
  | "analytics"
  | "admin"
  | "commandPalette"
  | "contextPanel"
  | "copilot";

export interface PluginRoute {
  path: string;
  /** Rendered by the host router (lazy component reference). */
  component: ComponentType<unknown>;
  /** RBAC hint — mapped by host, does NOT override existing RBAC. */
  role?: "requester" | "developer" | "admin" | "public";
}

export interface PluginCommand {
  id: string;
  title: string;
  description?: string;
  /** Optional keyboard hint, e.g. "mod+shift+p". Host may ignore. */
  shortcut?: string;
  section?: string;
  icon?: string;
  run: (ctx: CommandContext) => void | Promise<void>;
}

export interface CommandContext {
  navigate?: (path: string) => void;
  emit?: <K extends keyof PlatformEventMap>(
    name: K,
    payload: PlatformEventMap[K]
  ) => void;
}

export interface PluginWidget {
  id: string;
  /** Extension point this widget targets. */
  slot: ExtensionPointId;
  title?: string;
  order?: number;
  /** Widgets are pure React components; host controls layout. */
  render: (props: WidgetRenderProps) => ReactNode;
}

export interface WidgetRenderProps {
  slot: ExtensionPointId;
  pluginId: string;
}

export interface PluginPermissions {
  /** Capabilities this plugin declares it needs. */
  requires?: string[];
  /** Capabilities this plugin provides. */
  provides?: string[];
}

export interface PluginDependency {
  pluginId: string;
  /** Semver range or exact version. Simple comparator. */
  version?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  category: PluginCategory;
  description?: string;
  author?: string;
  routes?: PluginRoute[];
  commands?: PluginCommand[];
  widgets?: PluginWidget[];
  permissions?: PluginPermissions;
  dependencies?: PluginDependency[];
  /** Called once when host activates the plugin. Must be pure/idempotent. */
  activate?: (ctx: PluginContext) => void | Promise<void>;
  /** Called on deactivation. Must clean up any subscriptions. */
  deactivate?: () => void | Promise<void>;
}

export interface PluginRecord extends PluginManifest {
  status: PluginStatus;
  error?: string;
  loadedAt: number;
}

/* -------------------------------------------------------------------------- */
/* Event map — apenas arquitetura. Nenhum evento é emitido pelo core hoje.    */
/* -------------------------------------------------------------------------- */
export interface PlatformEventMap {
  "demand.created": { demandId: string; requesterId?: string };
  "workflow.executed": { workflowId: string; runId: string; status: string };
  "routing.finished": { demandId: string; candidateId?: string; score?: number };
  "knowledge.viewed": { articleId: string; userId?: string };
  "portal.request.created": { demandId: string; source: string };
  "system.matched": { demandId: string; systemSlug: string; similarity?: number };
  "feature.enabled": { flag: string; enabled: boolean };
}

export type PlatformEventName = keyof PlatformEventMap;

export interface PluginContext {
  bus: EventBus;
  permissions: PermissionsAPI;
  logger: (msg: string, meta?: unknown) => void;
}

export interface EventBus {
  emit<K extends PlatformEventName>(name: K, payload: PlatformEventMap[K]): void;
  on<K extends PlatformEventName>(
    name: K,
    handler: (payload: PlatformEventMap[K]) => void
  ): () => void;
  history(): ReadonlyArray<{ name: PlatformEventName; payload: unknown; at: number }>;
}

export interface PermissionsAPI {
  grant(pluginId: string, capability: string): void;
  revoke(pluginId: string, capability: string): void;
  can(pluginId: string, capability: string): boolean;
  listForPlugin(pluginId: string): string[];
}
