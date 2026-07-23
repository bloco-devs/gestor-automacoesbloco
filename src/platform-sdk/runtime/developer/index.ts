import type {
  PluginCommand,
  PluginWidget,
  ExtensionPointId,
} from "../../types";
import { platformRenderer, type RegisteredSidebarItem } from "../renderer";
import { platformPermissions } from "../../permissions/permissions";

/**
 * Developer API — helpers de registro.
 * Usado por autores de plugins fora do ciclo padrão (activate).
 * Todos apenas registram no Renderer / Permissions.
 */

export function registerWidget(pluginId: string, widget: PluginWidget): void {
  platformRenderer.registerWidget({ ...widget, pluginId });
}

export function registerCommand(pluginId: string, command: PluginCommand): void {
  platformRenderer.registerCommand({ ...command, pluginId });
}

export function registerSidebarItem(
  pluginId: string,
  item: Omit<RegisteredSidebarItem, "pluginId">
): void {
  platformRenderer.registerSidebarItem({ ...item, pluginId });
}

export function registerDashboardCard(
  pluginId: string,
  widget: Omit<PluginWidget, "slot">
): void {
  registerWidget(pluginId, { ...widget, slot: "dashboard" });
}

export function registerPanel(
  pluginId: string,
  slot: ExtensionPointId,
  widget: Omit<PluginWidget, "slot">
): void {
  registerWidget(pluginId, { ...widget, slot });
}

export function registerCapability(pluginId: string, capability: string): void {
  platformPermissions.grant(pluginId, capability);
}
