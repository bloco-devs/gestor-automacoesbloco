/**
 * Gera o texto Mermaid do Dependency Graph.
 * Somente leitura — não instala Mermaid; a UI usa `<pre>` com o texto.
 */
import type { CatalogEntry } from "../types";

export function buildDependencyMermaid(entries: CatalogEntry[]): string {
  const lines: string[] = ["graph TD"];
  lines.push("  Host[Plugin Host]");
  lines.push("  SDK[Platform SDK]");
  lines.push("  Host --> SDK");
  for (const e of entries) {
    const nodeId = e.id.replace(/[^a-z0-9]/gi, "_");
    lines.push(`  ${nodeId}["${e.name} v${e.version}"]`);
    lines.push(`  Host --> ${nodeId}`);
    for (const dep of e.dependencies) {
      const depId = dep.pluginId.replace(/[^a-z0-9]/gi, "_");
      lines.push(`  ${nodeId} --> ${depId}`);
    }
    for (const slot of e.extensionPoints) {
      lines.push(`  ${nodeId} -. ${slot} .-> XP_${slot}`);
    }
  }
  return lines.join("\n");
}
