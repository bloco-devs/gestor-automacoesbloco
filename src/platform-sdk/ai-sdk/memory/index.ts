/**
 * Memory Provider SDK — armazenamento in-memory por escopo. Não persiste.
 */
import type { AiMemoryEntry, AiMemoryProvider, AiMemoryScope } from "../types";
import { aiExtensionRegistry } from "../registry";

/**
 * Cria um provider in-memory padrão (session/conversation/workspace/temporary).
 */
export function createInMemoryProvider(
  scope: AiMemoryScope,
  pluginId: string,
  id: string,
  opts: { readOnly?: boolean } = {}
): AiMemoryProvider {
  const store = new Map<string, AiMemoryEntry[]>();
  return {
    kind: "memory-provider",
    id,
    pluginId,
    scope,
    readOnly: opts.readOnly,
    append: (key, entry) => {
      if (opts.readOnly) return;
      const arr = store.get(key) ?? [];
      arr.push(entry);
      store.set(key, arr);
    },
    list: (key) => (store.get(key) ?? []).slice(),
    clear: (key) => {
      if (opts.readOnly) return;
      store.delete(key);
    },
  };
}

export function createMockProvider(pluginId: string, id: string): AiMemoryProvider {
  const fixed: AiMemoryEntry[] = [];
  return {
    kind: "memory-provider",
    id,
    pluginId,
    scope: "mock",
    append: (_k, e) => fixed.push(e),
    list: () => fixed.slice(),
    clear: () => (fixed.length = 0),
  };
}

export function getMemory(id: string): AiMemoryProvider | undefined {
  return aiExtensionRegistry.get("memory-provider", id);
}
