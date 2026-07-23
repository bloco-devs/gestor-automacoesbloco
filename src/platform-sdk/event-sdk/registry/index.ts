/**
 * EventExtensionRegistry — indexação in-memory. Dedup por (kind:id).
 * Nunca lança.
 */
import type {
  EventExtension,
  EventExtensionKind,
  EventPublisher,
  EventSubscriber,
  EventInterceptor,
  EventMiddleware,
  EventPipeline,
} from "../types";

type Listener = () => void;

export interface EventRegistryDiagnostics {
  total: number;
  byKind: Record<EventExtensionKind, number>;
  byPlugin: Record<string, number>;
  byEvent: Record<string, number>;
}

export class EventExtensionRegistry {
  private items = new Map<string, EventExtension>();
  private listeners = new Set<Listener>();

  private key(kind: EventExtensionKind, id: string) {
    return `${kind}:${id}`;
  }

  register(ext: EventExtension): () => void {
    if (!ext?.id || !ext?.kind || !ext?.pluginId) return () => {};
    this.items.set(this.key(ext.kind, ext.id), ext);
    this.emit();
    return () => this.unregister(ext.kind, ext.id);
  }

  registerAll(exts: EventExtension[]): () => void {
    const ds = exts.map((e) => this.register(e));
    return () => ds.forEach((d) => d());
  }

  unregister(kind: EventExtensionKind, id: string): void {
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

  listAll(): EventExtension[] {
    return [...this.items.values()];
  }

  publishers(): EventPublisher[] {
    return this.byKind("publisher");
  }
  subscribers(event?: string): EventSubscriber[] {
    const s = this.byKind("subscriber") as EventSubscriber[];
    return event ? s.filter((x) => x.event === event) : s;
  }
  interceptors(event?: string): EventInterceptor[] {
    const s = this.byKind("interceptor") as EventInterceptor[];
    if (!event) return s;
    return s.filter((x) => !x.event || x.event === event);
  }
  middlewares(event?: string): EventMiddleware[] {
    const s = this.byKind("middleware") as EventMiddleware[];
    if (!event) return s;
    return s.filter((x) => !x.event || x.event === event);
  }
  pipelines(): EventPipeline[] {
    return this.byKind("pipeline");
  }

  private byKind<K extends EventExtensionKind>(k: K): Array<Extract<EventExtension, { kind: K }>> {
    return this.listAll().filter((e) => e.kind === k) as Array<
      Extract<EventExtension, { kind: K }>
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

  diagnostics(): EventRegistryDiagnostics {
    const byKind: Record<EventExtensionKind, number> = {
      publisher: 0,
      subscriber: 0,
      interceptor: 0,
      middleware: 0,
      pipeline: 0,
    };
    const byPlugin: Record<string, number> = {};
    const byEvent: Record<string, number> = {};
    for (const e of this.listAll()) {
      byKind[e.kind]++;
      byPlugin[e.pluginId] = (byPlugin[e.pluginId] ?? 0) + 1;
      const evt =
        "event" in e && typeof e.event === "string" ? e.event : "*";
      byEvent[evt] = (byEvent[evt] ?? 0) + 1;
    }
    return { total: this.items.size, byKind, byPlugin, byEvent };
  }

  __reset() {
    this.items.clear();
    this.emit();
  }
}

export const eventExtensionRegistry = new EventExtensionRegistry();
