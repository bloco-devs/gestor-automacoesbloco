import type {
  PluginManifest,
  PluginContext,
  PluginRecord,
  ExtensionPointId,
} from "../../types";
import { platformBus } from "../../events/eventBus";
import { platformPermissions } from "../../permissions/permissions";
import { scanPlugins, type PluginSource, type ScanResult } from "../scanner";
import { validateManifest, type ValidationResult } from "../validator";
import { diagnoseDependencies, type DependencyDiagnostics } from "../dependency";
import { runLifecycle, type LifecycleEvent } from "../lifecycle";
import { platformRenderer, PluginRenderer } from "../renderer";

export type HostPluginStatus =
  | "registered"
  | "loaded"
  | "active"
  | "disabled"
  | "rejected"
  | "error";

export interface HostPluginRecord extends PluginRecord {
  status: HostPluginStatus;
  validation?: ValidationResult;
  initMs?: number;
}

export interface HostDiagnostics {
  initializedAt: number | null;
  initDurationMs: number;
  scan: ScanResult | null;
  dependencies: DependencyDiagnostics | null;
  lifecycleEvents: LifecycleEvent[];
  plugins: HostPluginRecord[];
}

type Listener = () => void;

/**
 * PluginHost — orquestra scanner → validator → resolver → lifecycle.
 * Nenhum erro derruba o Host. Todos os erros ficam em diagnostics.
 */
export class PluginHost {
  private plugins = new Map<string, HostPluginRecord>();
  private lifecycleEvents: LifecycleEvent[] = [];
  private scan: ScanResult | null = null;
  private deps: DependencyDiagnostics | null = null;
  private initializedAt: number | null = null;
  private initDurationMs = 0;
  private listeners = new Set<Listener>();

  constructor(public readonly renderer: PluginRenderer = platformRenderer) {}

  private ctx(): PluginContext {
    return {
      bus: platformBus,
      permissions: platformPermissions,
      logger: (msg, meta) => {
        // eslint-disable-next-line no-console
        console.debug("[plugin-host]", msg, meta ?? "");
      },
    };
  }

  async initialize(sources: PluginSource[]): Promise<HostDiagnostics> {
    const t0 = performance.now();
    this.scan = await scanPlugins(sources);

    // Validate + register
    const validManifests: PluginManifest[] = [];
    for (const m of this.scan.manifests) {
      const validation = validateManifest(m);
      const record: HostPluginRecord = {
        ...(m as PluginManifest),
        status: validation.valid ? "registered" : "rejected",
        validation,
        loadedAt: Date.now(),
        error: validation.valid ? undefined : validation.errors.join("; "),
      };
      // Guarda mesmo se rejeitado (para diagnóstico)
      if (record.id && !this.plugins.has(record.id)) {
        this.plugins.set(record.id, record);
        if (validation.valid) validManifests.push(m as PluginManifest);
      }
    }

    // Resolve
    this.deps = diagnoseDependencies(validManifests);

    // Load + Enable em ordem topológica
    for (const id of this.deps.order) {
      const p = this.plugins.get(id);
      if (!p || p.status === "rejected") continue;
      // Bloqueia se tiver dependência ausente/ciclo (versão apenas warn)
      const fatal = this.deps.issues.find(
        (i) => i.pluginId === id && i.kind !== "version"
      );
      if (fatal) {
        p.status = "error";
        p.error = fatal.detail;
        continue;
      }

      const loadEv = await runLifecycle(p, "load", this.ctx());
      this.lifecycleEvents.push(loadEv);
      if (loadEv.error) {
        p.status = "error";
        p.error = loadEv.error;
        continue;
      }
      p.status = "loaded";

      const enableEv = await runLifecycle(p, "enable", this.ctx());
      this.lifecycleEvents.push(enableEv);
      if (enableEv.error) {
        p.status = "error";
        p.error = enableEv.error;
        continue;
      }

      // Registra widgets/commands/provides
      for (const w of p.widgets ?? []) {
        this.renderer.registerWidget({ ...w, pluginId: p.id });
      }
      for (const c of p.commands ?? []) {
        this.renderer.registerCommand({ ...c, pluginId: p.id });
      }
      for (const cap of p.permissions?.provides ?? []) {
        platformPermissions.grant(p.id, cap);
      }

      p.initMs = (loadEv.durationMs ?? 0) + (enableEv.durationMs ?? 0);
      p.status = "active";
    }

    this.initDurationMs = performance.now() - t0;
    this.initializedAt = Date.now();
    this.emit();
    return this.diagnostics();
  }

  async disable(id: string): Promise<void> {
    const p = this.plugins.get(id);
    if (!p || p.status !== "active") return;
    const ev = await runLifecycle(p, "disable", this.ctx());
    this.lifecycleEvents.push(ev);
    this.renderer.unregisterPlugin(id);
    p.status = "disabled";
    this.emit();
  }

  async enable(id: string): Promise<void> {
    const p = this.plugins.get(id);
    if (!p || p.status !== "disabled") return;
    const ev = await runLifecycle(p, "enable", this.ctx());
    this.lifecycleEvents.push(ev);
    if (ev.error) {
      p.status = "error";
      p.error = ev.error;
    } else {
      for (const w of p.widgets ?? []) this.renderer.registerWidget({ ...w, pluginId: p.id });
      for (const c of p.commands ?? []) this.renderer.registerCommand({ ...c, pluginId: p.id });
      p.status = "active";
    }
    this.emit();
  }

  async reload(id: string): Promise<void> {
    await this.disable(id);
    await this.enable(id);
  }

  async unload(id: string): Promise<void> {
    const p = this.plugins.get(id);
    if (!p) return;
    if (p.status === "active") await this.disable(id);
    const ev = await runLifecycle(p, "unload", this.ctx());
    this.lifecycleEvents.push(ev);
    this.plugins.delete(id);
    this.emit();
  }

  list(): HostPluginRecord[] {
    return Array.from(this.plugins.values());
  }

  widgets(slot?: ExtensionPointId) {
    return this.renderer.listWidgets(slot);
  }
  commands() {
    return this.renderer.listCommands();
  }

  diagnostics(): HostDiagnostics {
    return {
      initializedAt: this.initializedAt,
      initDurationMs: this.initDurationMs,
      scan: this.scan,
      dependencies: this.deps,
      lifecycleEvents: this.lifecycleEvents.slice(),
      plugins: this.list(),
    };
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private emit() {
    for (const l of this.listeners) l();
  }

  __resetForTests(): void {
    for (const id of Array.from(this.plugins.keys())) {
      this.renderer.unregisterPlugin(id);
    }
    this.plugins.clear();
    this.lifecycleEvents = [];
    this.scan = null;
    this.deps = null;
    this.initializedAt = null;
    this.initDurationMs = 0;
    this.emit();
  }
}

export const pluginHost = new PluginHost();
