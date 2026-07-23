/**
 * Marketplace — bundled plugin registry.
 * PLUGIN 004: passa a alimentar o Repository API. As exports abaixo
 * (BUNDLED_PLUGINS, bundledSources, originOf) permanecem estáveis para
 * compatibilidade com o Sandbox e os testes existentes.
 */
import HelloPlugin from "@/platform-sdk/runtime/plugins/hello";
import AICopilotPlugin from "@/plugins/ai-copilot";
import type { PluginManifest } from "@/platform-sdk";
import {
  bootstrapDefaultRepositories,
  pluginRepositoryRegistry,
  type BundledSource,
  type PluginPackage,
} from "@/platform-sdk/extension-host";
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

/** Sources aceitas pelo BundledRepository (Extension Host). */
export function bundledRepositorySources(): BundledSource[] {
  return BUNDLED_PLUGINS.map((b) => ({
    manifest: b.manifest,
    publisher: "platform.bundled",
    keywords: [b.manifest.category],
  }));
}

/** Idempotente: garante que o Repository default está inicializado. */
export function ensureRepositoriesBootstrapped() {
  bootstrapDefaultRepositories(bundledRepositorySources());
  return pluginRepositoryRegistry;
}

export function originOf(id: string): PluginOrigin {
  return BUNDLED_PLUGINS.find((b) => b.manifest.id === id)?.origin ?? "remote";
}

/** Coleta todos os packages via Repository API. */
export async function collectPackages(): Promise<
  { repositoryId: string; pkg: PluginPackage }[]
> {
  ensureRepositoriesBootstrapped();
  const collected = await pluginRepositoryRegistry.collect();
  return collected.map(({ repository, pkg }) => ({
    repositoryId: repository.id,
    pkg,
  }));
}
