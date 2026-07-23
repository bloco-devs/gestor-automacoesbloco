/**
 * Repository API — camada de descoberta de plugins (PLUGIN 004).
 * Todo consumidor (Loader, Marketplace, Sandbox) DEVE ler daqui.
 */
export * from "./types";
export { BundledRepository } from "./bundled";
export type { BundledSource } from "./bundled";
export { LocalRepository } from "./local";
export { RemoteRepository } from "./remote";
export type { RemoteRepositoryOptions } from "./remote";

import type { PluginRepository, PluginPackage } from "./types";
import { BundledRepository, type BundledSource } from "./bundled";
import { LocalRepository } from "./local";
import { RemoteRepository } from "./remote";

/**
 * PluginRepositoryRegistry — indexa múltiplos repositories.
 * O Loader percorre todos e agrega os packages (dedup por id, prioridade
 * pela ordem de registro).
 */
export class PluginRepositoryRegistry {
  private repositories: PluginRepository[] = [];

  register(repo: PluginRepository) {
    if (this.repositories.some((r) => r.id === repo.id)) return;
    this.repositories.push(repo);
  }

  unregister(id: string) {
    this.repositories = this.repositories.filter((r) => r.id !== id);
  }

  list(): PluginRepository[] {
    return [...this.repositories];
  }

  get(id: string): PluginRepository | undefined {
    return this.repositories.find((r) => r.id === id);
  }

  async collect(): Promise<{ repository: PluginRepository; pkg: PluginPackage }[]> {
    const out: { repository: PluginRepository; pkg: PluginPackage }[] = [];
    const seen = new Set<string>();
    for (const repo of this.repositories) {
      const pkgs = await repo.list();
      for (const pkg of pkgs) {
        if (seen.has(pkg.id)) continue;
        seen.add(pkg.id);
        out.push({ repository: repo, pkg });
      }
    }
    return out;
  }

  reset() {
    this.repositories = [];
  }
}

/** Singleton default consumido pelo Loader/Marketplace/Sandbox. */
export const pluginRepositoryRegistry = new PluginRepositoryRegistry();

/**
 * Bootstrap padrão: bundled + local + remote(placeholder).
 * Idempotente — chamável no boot do Sandbox/Marketplace.
 */
export function bootstrapDefaultRepositories(bundled: BundledSource[]) {
  if (pluginRepositoryRegistry.list().length > 0) return pluginRepositoryRegistry;
  pluginRepositoryRegistry.register(new BundledRepository(bundled));
  pluginRepositoryRegistry.register(new LocalRepository());
  pluginRepositoryRegistry.register(new RemoteRepository({ advertised: true }));
  return pluginRepositoryRegistry;
}
