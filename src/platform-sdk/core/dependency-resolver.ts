import type { PluginDependency, PluginManifest } from "../types";

export interface DependencyIssue {
  pluginId: string;
  kind: "missing" | "version" | "cycle";
  detail: string;
}

/** Comparação semver simplificada: aceita "x.y.z" e comparadores ">=", "^", "~". */
function parseVersion(v: string): [number, number, number] {
  const [maj, min, pat] = v.replace(/^[\^~>=<]+/, "").split(".").map((n) => Number(n) || 0);
  return [maj, min, pat];
}

function satisfies(actual: string, required: string): boolean {
  const [a1, a2, a3] = parseVersion(actual);
  const [r1, r2, r3] = parseVersion(required);
  if (required.startsWith("^")) return a1 === r1 && (a2 > r2 || (a2 === r2 && a3 >= r3));
  if (required.startsWith("~")) return a1 === r1 && a2 === r2 && a3 >= r3;
  if (required.startsWith(">=")) {
    if (a1 !== r1) return a1 > r1;
    if (a2 !== r2) return a2 > r2;
    return a3 >= r3;
  }
  return a1 === r1 && a2 === r2 && a3 === r3;
}

/**
 * Resolve dependências de um conjunto de plugins. Retorna:
 * - order: ordem topológica de ativação (pais antes de filhos).
 * - issues: problemas encontrados (missing, version mismatch, ciclos).
 */
export function resolveDependencies(plugins: PluginManifest[]): {
  order: string[];
  issues: DependencyIssue[];
} {
  const byId = new Map(plugins.map((p) => [p.id, p]));
  const issues: DependencyIssue[] = [];
  const order: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string, stack: string[]): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      issues.push({
        pluginId: id,
        kind: "cycle",
        detail: `Cycle detected: ${[...stack, id].join(" -> ")}`,
      });
      return;
    }
    const p = byId.get(id);
    if (!p) return;
    visiting.add(id);
    for (const dep of p.dependencies ?? []) {
      const target = byId.get(dep.pluginId);
      if (!target) {
        issues.push({
          pluginId: p.id,
          kind: "missing",
          detail: `Missing dependency: ${dep.pluginId}`,
        });
        continue;
      }
      if (dep.version && !satisfies(target.version, dep.version)) {
        issues.push({
          pluginId: p.id,
          kind: "version",
          detail: `Requires ${dep.pluginId}@${dep.version}, found ${target.version}`,
        });
      }
      visit(dep.pluginId, [...stack, id]);
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };

  for (const p of plugins) visit(p.id, []);
  return { order, issues };
}

export { satisfies as __satisfies };
