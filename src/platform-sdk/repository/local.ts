/**
 * LocalRepository — persistido em localStorage (dev/QA).
 * Publicação e remoção liberadas. Não usado em produção.
 */
import type { PluginPackage, PluginRepository } from "./types";

const STORAGE_KEY = "platform.repository.local.v1";

function readStore(): PluginPackage[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(pkgs: PluginPackage[]) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pkgs));
  } catch {
    /* ignore */
  }
}

export class LocalRepository implements PluginRepository {
  readonly id = "local";
  readonly kind = "local" as const;
  readonly label = "Local";
  private memory: PluginPackage[] = [];

  constructor() {
    this.memory = readStore();
  }

  async list(): Promise<PluginPackage[]> {
    return [...this.memory];
  }

  async get(id: string): Promise<PluginPackage | null> {
    return this.memory.find((p) => p.id === id) ?? null;
  }

  async publish(pkg: PluginPackage): Promise<void> {
    const idx = this.memory.findIndex((p) => p.id === pkg.id);
    if (idx >= 0) this.memory[idx] = pkg;
    else this.memory.push(pkg);
    writeStore(this.memory);
  }

  async remove(id: string): Promise<void> {
    this.memory = this.memory.filter((p) => p.id !== id);
    writeStore(this.memory);
  }

  /** Testes. */
  __reset() {
    this.memory = [];
    writeStore([]);
  }
}
