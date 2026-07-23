/**
 * Cache persistente sobre localStorage.
 * Silencioso em ambientes sem window/localStorage (SSR, tests).
 */
interface Envelope<V> {
  v: V;
  e: number | null;
}

export class StorageCache<V> {
  constructor(private readonly namespace: string, private readonly defaultTtlMs: number | null = null) {}

  private key(k: string): string {
    return `${this.namespace}:${k}`;
  }

  private storage(): Storage | null {
    try {
      return typeof window !== "undefined" ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  get(k: string): V | undefined {
    const s = this.storage();
    if (!s) return undefined;
    const raw = s.getItem(this.key(k));
    if (!raw) return undefined;
    try {
      const env = JSON.parse(raw) as Envelope<V>;
      if (env.e !== null && env.e < Date.now()) {
        s.removeItem(this.key(k));
        return undefined;
      }
      return env.v;
    } catch {
      return undefined;
    }
  }

  set(k: string, value: V, ttlMs?: number | null): void {
    const s = this.storage();
    if (!s) return;
    const ttl = ttlMs === undefined ? this.defaultTtlMs : ttlMs;
    const env: Envelope<V> = { v: value, e: ttl === null ? null : Date.now() + ttl };
    try {
      s.setItem(this.key(k), JSON.stringify(env));
    } catch {
      /* quota exceeded — ignora */
    }
  }

  delete(k: string): void {
    this.storage()?.removeItem(this.key(k));
  }
}
