/**
 * FEATURE 026 — Dependency Graph (Onda 8).
 * Mermaid gerado em runtime a partir de módulos conhecidos.
 * Aditivo e read-only; não descobre imports (para não acoplar bundler).
 */
export interface DepFilter {
  module?: string;
}

const EDGES: ReadonlyArray<[string, string]> = [
  ["Portal", "Routing"],
  ["Portal", "Knowledge"],
  ["Portal", "AI"],
  ["Workspace", "Routing"],
  ["Workspace", "AI"],
  ["Workspace", "Workflow"],
  ["Routing", "AI"],
  ["Knowledge", "AI"],
  ["AI", "ServiceMesh"],
  ["Workflow", "ServiceMesh"],
  ["Marketplace", "Plugins"],
  ["Plugins", "ServiceMesh"],
  ["Plugins", "SDKs"],
  ["SDKs", "ServiceMesh"],
];

export function buildMermaidGraph(filter: DepFilter = {}): string {
  const filtered = filter.module
    ? EDGES.filter(([a, b]) => a === filter.module || b === filter.module)
    : EDGES;
  const lines = ["flowchart LR"];
  for (const [a, b] of filtered) lines.push(`  ${a} --> ${b}`);
  return lines.join("\n");
}

export function listModules(): string[] {
  const set = new Set<string>();
  for (const [a, b] of EDGES) {
    set.add(a);
    set.add(b);
  }
  return Array.from(set).sort();
}
