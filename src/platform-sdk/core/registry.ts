import type {
  PluginCommand,
  PluginManifest,
  PluginRecord,
  PluginStatus,
  PluginWidget,
  ExtensionPointId,
  PluginContext,
} from "../types";
import { platformBus } from "../events/eventBus";
import { platformPermissions } from "../permissions/permissions";
import { resolveDependencies, type DependencyIssue } from "./dependency-resolver";

type Listener = () => void;

class PluginRegistry {
  private plugins = new Map<string, PluginRecord>();
  private listeners = new Set<Listener>();
  private lastIssues: DependencyIssue[] = [];

  register(manifest: PluginManifest): PluginRecord {
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin already registered: ${manifest.id}`);
    }
    const record: PluginRecord = {
      ...manifest,
      status: "registered",
      loadedAt: Date.now(),
    };
    this.plugins.set(manifest.id, record);
    this.emit();
    return record;
  }

  unregister(id: string): void {
    const p = this.plugins.get(id);
    if (!p) return;
    if (p.status === "active") {
      try {
        p.deactivate?.();
      } catch {
        /* isolar */
      }
    }
    this.plugins.delete(id);
    this.emit();
  }

  /** Ativa todos os plugins registrados, respeitando ordem topológica. */
  async activateAll(): Promise<{ activated: string[]; issues: DependencyIssue[] }> {
    const list = Array.from(this.plugins.values());
    const { order, issues } = resolveDependencies(list);
    this.lastIssues = issues;
    const activated: string[] = [];
    const ctx: PluginContext = {
      bus: platformBus,
      permissions: platformPermissions,
      logger: (msg, meta) =>
        // eslint-disable-next-line no-console
        console.debug("[plugin]", msg, meta ?? ""),
    };

    for (const id of order) {
      const p = this.plugins.get(id);
      if (!p) continue;
      if (issues.some((i) => i.pluginId === id && i.kind !== "version")) {
        this.setStatus(id, "error", `Dependency issue for ${id}`);
        continue;
      }
      try {
        await p.activate?.(ctx);
        for (const cap of p.permissions?.provides ?? []) {
          platformPermissions.grant(id, cap);
        }
        this.setStatus(id, "active");
        activated.push(id);
      } catch (err) {
        this.setStatus(
          id,
          "error",
          err instanceof Error ? err.message : String(err)
        );
      }
    }
    return { activated, issues };
  }

  private setStatus(id: string, status: PluginStatus, error?: string): void {
    const p = this.plugins.get(id);
    if (!p) return;
    p.status = status;
    p.error = error;
    this.emit();
  }

  get(id: string): PluginRecord | undefined {
    return this.plugins.get(id);
  }

  list(): PluginRecord[] {
    return Array.from(this.plugins.values());
  }

  issues(): DependencyIssue[] {
    return this.lastIssues.slice();
  }

  /* ------------------------------------------------------------------ */
  /* Agregações — usadas pelo host (Sidebar, Command Palette, etc.)     */
  /* ------------------------------------------------------------------ */
  commands(): (PluginCommand & { pluginId: string })[] {
    const out: (PluginCommand & { pluginId: string })[] = [];
    for (const p of this.plugins.values()) {
      if (p.status !== "active") continue;
      for (const c of p.commands ?? []) out.push({ ...c, pluginId: p.id });
    }
    return out;
  }

  widgets(slot?: ExtensionPointId): (PluginWidget & { pluginId: string })[] {
    const out: (PluginWidget & { pluginId: string })[] = [];
    for (const p of this.plugins.values()) {
      if (p.status !== "active") continue;
      for (const w of p.widgets ?? []) {
        if (!slot || w.slot === slot) out.push({ ...w, pluginId: p.id });
      }
    }
    return out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  routes(): { pluginId: string; path: string; role?: string }[] {
    const out: { pluginId: string; path: string; role?: string }[] = [];
    for (const p of this.plugins.values()) {
      for (const r of p.routes ?? []) {
        out.push({ pluginId: p.id, path: r.path, role: r.role });
      }
    }
    return out;
  }

  /* Reatividade simples (padrão useSyncExternalStore). */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit() {
    for (const l of this.listeners) l();
  }

  /** Test-only: limpa o registry entre testes. */
  __resetForTests(): void {
    this.plugins.clear();
    this.lastIssues = [];
    this.emit();
  }
}

export const pluginRegistry = new PluginRegistry();
export type { PluginRegistry };
