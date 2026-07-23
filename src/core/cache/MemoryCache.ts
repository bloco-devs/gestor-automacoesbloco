interface Entry<V> {
  value: V;
  expiresAt: number | null;
}

export interface MemoryCacheOptions {
  defaultTtlMs?: number | null;
  maxEntries?: number;
}

export class MemoryCache<K, V> {
  private map = new Map<K, Entry<V>>();
  private readonly ttl: number | null;
  private readonly maxEntries: number;

  constructor(options: MemoryCacheOptions = {}) {
    this.ttl = options.defaultTtlMs ?? null;
    this.maxEntries = options.maxEntries ?? 500;
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // LRU: reinsere para topo
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number | null): void {
    const ttl = ttlMs === undefined ? this.ttl : ttlMs;
    const expiresAt = ttl === null ? null : Date.now() + ttl;
    if (this.map.size >= this.maxEntries) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, { value, expiresAt });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}
