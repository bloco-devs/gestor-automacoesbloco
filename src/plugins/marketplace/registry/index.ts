/**
 * Marketplace — bundled plugin registry.
 * Todo plugin local disponível para o Host aparece aqui.
 * Não altera o Core: apenas centraliza as referências que já eram
 * usadas pelo SdkSandbox.
 */
import HelloPlugin from "@/platform-sdk/runtime/plugins/hello";
import AICopilotPlugin from "@/plugins/ai-copilot";
import type { PluginManifest } from "@/platform-sdk";
import type { PluginOrigin } from "../types";

export interface BundledRegistration {
  manifest: PluginManifest;
  origin: PluginOrigin;
}

export const BUNDLED_PLUGINS: BundledRegistration[] = [
  { manifest: HelloPlugin, origin: "bundled" },
  { manifest: AICopilotPlugin, origin: "bundled" },
];

/** Sources aceitas pelo `pluginHost.initialize`. */
export function bundledSources() {
  return BUNDLED_PLUGINS.map((b) => b.manifest);
}

export function originOf(id: string): PluginOrigin {
  return BUNDLED_PLUGINS.find((b) => b.manifest.id === id)?.origin ?? "remote";
}
