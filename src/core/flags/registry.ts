import type { FlagDefinition, FlagKey } from "./types";

const registry = new Map<FlagKey, FlagDefinition>();
const overrides = new Map<FlagKey, boolean>();

export function registerFlag(def: FlagDefinition): void {
  if (registry.has(def.key)) {
    // Idempotente: mantém a primeira definição.
    return;
  }
  registry.set(def.key, def);
}

export function registerFlags(defs: FlagDefinition[]): void {
  defs.forEach(registerFlag);
}

export function listFlags(): FlagDefinition[] {
  return Array.from(registry.values());
}

export function getFlagDefinition(key: FlagKey): FlagDefinition | undefined {
  return registry.get(key);
}

/**
 * Resolve o valor efetivo de uma flag.
 * Ordem: override em memória → env var → default.
 * Não lê Supabase aqui — leitura remota fica em `src/core/flags/remote.ts` (futuro).
 */
export function isFlagEnabled(key: FlagKey): boolean {
  if (overrides.has(key)) return overrides.get(key)!;
  const def = registry.get(key);
  if (!def) return false;
  if (def.envVar) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = (import.meta as any)?.env ?? {};
      const raw = env[def.envVar];
      if (raw !== undefined) return raw === "true" || raw === "1";
    } catch {
      /* noop */
    }
  }
  return def.defaultValue;
}

/** Override em memória para testes e toggle admin. */
export function setFlagOverride(key: FlagKey, value: boolean | null): void {
  if (value === null) overrides.delete(key);
  else overrides.set(key, value);
}

export function __resetFlagRegistry(): void {
  registry.clear();
  overrides.clear();
}
