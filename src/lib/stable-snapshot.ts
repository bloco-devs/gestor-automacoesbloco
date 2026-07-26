/**
 * stableSnapshot — evita loops infinitos com `useSyncExternalStore`.
 *
 * React exige que `getSnapshot` retorne a MESMA referência enquanto o store
 * não mudar. Muitos stores in-memory do projeto retornam `arr.slice()` /
 * `{...obj}` a cada chamada, o que dispara re-render infinito
 * ("Maximum update depth exceeded" — React error #185) em build de produção.
 *
 * Este wrapper memoiza o último valor e o reutiliza quando o novo é
 * shallow-equal, mantendo a referência estável.
 */

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;

  if (aArr && bArr) {
    if (a.length !== (b as unknown[]).length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], (b as unknown[])[i])) return false;
    }
    return true;
  }

  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
      return false;
    }
  }
  return true;
}

export function stableSnapshot<T>(fn: () => T): () => T {
  let last: T;
  let initialized = false;
  return () => {
    const next = fn();
    if (initialized && shallowEqual(last, next)) return last;
    last = next;
    initialized = true;
    return next;
  };
}

export { shallowEqual };
