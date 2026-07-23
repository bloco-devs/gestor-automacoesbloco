/**
 * BundledRepository — plugins compilados junto ao app.
 * Ler somente. Assina manifests com o publisher "platform.bundled".
 */
import type { PluginManifest } from "../types";
import type { PluginPackage, PluginRepository } from "./types";
import { signManifest } from "../signature";

export interface BundledSource {
  manifest: PluginManifest;
  publisher?: string;
  readme?: string;
  changelog?: string;
  keywords?: string[];
  iconUrl?: string;
}

async function buildPackage(src: BundledSource): Promise<PluginPackage> {
  const publisher = src.publisher ?? "platform.bundled";
  const signature = await signManifest(src.manifest, publisher);
  return {
    id: src.manifest.id,
    version: src.manifest.version,
    manifest: src.manifest,
    metadata: {
      sdkVersion: "1.0.0",
      hostVersion: "1.0.0",
      keywords: src.keywords ?? [src.manifest.category],
      publisher,
      publishedAt: Date.now(),
      readme: src.readme,
      changelog: src.changelog,
      iconUrl: src.iconUrl,
    },
    signature,
  };
}

export class BundledRepository implements PluginRepository {
  readonly id = "bundled";
  readonly kind = "bundled" as const;
  readonly label = "Bundled";
  private cache: PluginPackage[] | null = null;

  constructor(private sources: BundledSource[]) {}

  async list(): Promise<PluginPackage[]> {
    if (this.cache) return this.cache;
    const out = await Promise.all(this.sources.map(buildPackage));
    this.cache = out;
    return out;
  }

  async get(id: string): Promise<PluginPackage | null> {
    const all = await this.list();
    return all.find((p) => p.id === id) ?? null;
  }

  /** Testes — permite reconfigurar. */
  __reset(sources: BundledSource[]) {
    this.sources = sources;
    this.cache = null;
  }
}
