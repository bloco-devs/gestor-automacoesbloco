/**
 * AiExtensionRegistry — indexação in-memory. Dedup por (kind:id). Nunca lança.
 */
import type {
  AiExtension,
  AiExtensionKind,
  AiSkill,
  AiPrompt,
  AiTool,
  AiContextBuilder,
  AiAgent,
  AiMemoryProvider,
  AiRouter,
} from "../types";

type Listener = () => void;

export interface AiRegistryDiagnostics {
  total: number;
  byKind: Record<AiExtensionKind, number>;
  byPlugin: Record<string, number>;
}

export class AiExtensionRegistry {
  private items = new Map<string, AiExtension>();
  private listeners = new Set<Listener>();
  private usage: Record<string, number> = {};

  private key(kind: AiExtensionKind, id: string) {
    return `${kind}:${id}`;
  }

  register(ext: AiExtension): () => void {
    if (!ext?.id || !ext?.kind || !ext?.pluginId) return () => {};
    this.items.set(this.key(ext.kind, ext.id), ext);
    this.emit();
    return () => this.unregister(ext.kind, ext.id);
  }

  registerAll(exts: AiExtension[]): () => void {
    const ds = exts.map((e) => this.register(e));
    return () => ds.forEach((d) => d());
  }

  unregister(kind: AiExtensionKind, id: string): void {
    if (this.items.delete(this.key(kind, id))) this.emit();
  }

  removePlugin(pluginId: string): number {
    let n = 0;
    for (const [k, v] of this.items) {
      if (v.pluginId === pluginId) {
        this.items.delete(k);
        n++;
      }
    }
    if (n > 0) this.emit();
    return n;
  }

  get<K extends AiExtensionKind>(
    kind: K,
    id: string
  ): Extract<AiExtension, { kind: K }> | undefined {
    return this.items.get(this.key(kind, id)) as
      | Extract<AiExtension, { kind: K }>
      | undefined;
  }

  listAll(): AiExtension[] {
    return [...this.items.values()];
  }

  skills(): AiSkill[] {
    return this.byKind("skill");
  }
  prompts(slot?: string): AiPrompt[] {
    const p = this.byKind("prompt") as AiPrompt[];
    return slot ? p.filter((x) => x.slot === slot) : p;
  }
  tools(): AiTool[] {
    return this.byKind("tool");
  }
  contextBuilders(scope?: string): AiContextBuilder[] {
    const cb = this.byKind("context-builder") as AiContextBuilder[];
    return scope ? cb.filter((x) => x.scope === scope) : cb;
  }
  agents(): AiAgent[] {
    return this.byKind("agent");
  }
  memory(): AiMemoryProvider[] {
    return this.byKind("memory-provider");
  }
  routers(): AiRouter[] {
    return this.byKind("router");
  }

  private byKind<K extends AiExtensionKind>(k: K): Array<Extract<AiExtension, { kind: K }>> {
    return this.listAll().filter((e) => e.kind === k) as Array<
      Extract<AiExtension, { kind: K }>
    >;
  }

  recordUse(kind: AiExtensionKind, id: string) {
    const k = this.key(kind, id);
    this.usage[k] = (this.usage[k] ?? 0) + 1;
  }

  getUsage(): Record<string, number> {
    return { ...this.usage };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        /* ignore */
      }
    }
  }

  diagnostics(): AiRegistryDiagnostics {
    const byKind: Record<AiExtensionKind, number> = {
      skill: 0,
      prompt: 0,
      tool: 0,
      "context-builder": 0,
      agent: 0,
      "memory-provider": 0,
      router: 0,
    };
    const byPlugin: Record<string, number> = {};
    for (const e of this.listAll()) {
      byKind[e.kind]++;
      byPlugin[e.pluginId] = (byPlugin[e.pluginId] ?? 0) + 1;
    }
    return { total: this.items.size, byKind, byPlugin };
  }

  __reset() {
    this.items.clear();
    this.usage = {};
    this.emit();
  }
}

export const aiExtensionRegistry = new AiExtensionRegistry();
