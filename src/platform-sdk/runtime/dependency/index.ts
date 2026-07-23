import type { PluginManifest } from "../../types";
import { resolveDependencies, type DependencyIssue } from "../../core/dependency-resolver";

export interface DependencyDiagnostics {
  order: string[];
  issues: DependencyIssue[];
  chains: Record<string, string[]>;
  orphans: string[];
  incompatible: string[];
  durationMs: number;
}

/**
 * Wrapper diagnóstico sobre resolveDependencies.
 * Adiciona cadeias de dependência, órfãos, incompatíveis e tempo.
 */
export function diagnoseDependencies(plugins: PluginManifest[]): DependencyDiagnostics {
  const t0 = performance.now();
  const { order, issues } = resolveDependencies(plugins);

  const chains: Record<string, string[]> = {};
  const byId = new Map(plugins.map((p) => [p.id, p]));

  const walk = (id: string, visited = new Set<string>()): string[] => {
    if (visited.has(id)) return [];
    visited.add(id);
    const p = byId.get(id);
    if (!p) return [];
    const out: string[] = [];
    for (const d of p.dependencies ?? []) {
      out.push(d.pluginId, ...walk(d.pluginId, visited));
    }
    return out;
  };

  for (const p of plugins) chains[p.id] = walk(p.id);

  const referenced = new Set<string>();
  for (const p of plugins) for (const d of p.dependencies ?? []) referenced.add(d.pluginId);

  const orphans = plugins
    .filter((p) => (p.dependencies ?? []).length === 0 && !referenced.has(p.id))
    .map((p) => p.id);

  const incompatible = Array.from(
    new Set(issues.filter((i) => i.kind === "version").map((i) => i.pluginId))
  );

  return {
    order,
    issues,
    chains,
    orphans,
    incompatible,
    durationMs: performance.now() - t0,
  };
}
