/**
 * WorkflowExtensionRegistry — indexação in-memory de extensões
 * registradas por plugins. Nunca lança; dedup por (kind:id).
 */
import type {
  WorkflowExtension,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
  WorkflowValidator,
  WorkflowTransformer,
  WorkflowHook,
  WorkflowExtensionKind,
} from "../types";

type Listener = () => void;

export interface RegistryDiagnostics {
  total: number;
  byKind: Record<WorkflowExtensionKind, number>;
  byPlugin: Record<string, number>;
}

export class WorkflowExtensionRegistry {
  private extensions = new Map<string, WorkflowExtension>();
  private listeners = new Set<Listener>();

  private key(kind: WorkflowExtensionKind, id: string) {
    return `${kind}:${id}`;
  }

  register(ext: WorkflowExtension): () => void {
    if (!ext?.id || !ext?.kind || !ext?.pluginId) return () => {};
    const k = this.key(ext.kind, ext.id);
    this.extensions.set(k, ext);
    this.emit();
    return () => this.unregister(ext.kind, ext.id);
  }

  registerAll(exts: WorkflowExtension[]): () => void {
    const disposers = exts.map((e) => this.register(e));
    return () => disposers.forEach((d) => d());
  }

  unregister(kind: WorkflowExtensionKind, id: string): void {
    if (this.extensions.delete(this.key(kind, id))) this.emit();
  }

  removePlugin(pluginId: string): number {
    let n = 0;
    for (const [k, v] of this.extensions) {
      if (v.pluginId === pluginId) {
        this.extensions.delete(k);
        n++;
      }
    }
    if (n > 0) this.emit();
    return n;
  }

  get<K extends WorkflowExtensionKind>(
    kind: K,
    id: string
  ): Extract<WorkflowExtension, { kind: K }> | undefined {
    return this.extensions.get(this.key(kind, id)) as
      | Extract<WorkflowExtension, { kind: K }>
      | undefined;
  }

  listAll(): WorkflowExtension[] {
    return [...this.extensions.values()];
  }

  triggers(): WorkflowTrigger[] {
    return this.byKind("trigger");
  }
  conditions(): WorkflowCondition[] {
    return this.byKind("condition");
  }
  actions(): WorkflowAction[] {
    return this.byKind("action");
  }
  validators(): WorkflowValidator[] {
    return this.byKind("validator");
  }
  transformers(): WorkflowTransformer[] {
    return this.byKind("transformer");
  }
  hooks(): WorkflowHook[] {
    return this.byKind("hook");
  }

  private byKind<K extends WorkflowExtensionKind>(k: K): Array<Extract<WorkflowExtension, { kind: K }>> {
    return this.listAll().filter((e) => e.kind === k) as Array<
      Extract<WorkflowExtension, { kind: K }>
    >;
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

  diagnostics(): RegistryDiagnostics {
    const byKind: Record<WorkflowExtensionKind, number> = {
      trigger: 0,
      condition: 0,
      action: 0,
      validator: 0,
      transformer: 0,
      hook: 0,
    };
    const byPlugin: Record<string, number> = {};
    for (const e of this.listAll()) {
      byKind[e.kind]++;
      byPlugin[e.pluginId] = (byPlugin[e.pluginId] ?? 0) + 1;
    }
    return { total: this.extensions.size, byKind, byPlugin };
  }

  /** Testes. */
  __reset() {
    this.extensions.clear();
    this.emit();
  }
}

/** Singleton default. */
export const workflowExtensionRegistry = new WorkflowExtensionRegistry();
