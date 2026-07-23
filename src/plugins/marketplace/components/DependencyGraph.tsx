import { useMemo } from "react";
import { buildDependencyMermaid } from "../utils/mermaid";
import type { CatalogEntry } from "../types";

/**
 * Dependency Graph — leitura apenas.
 * Renderiza o Mermaid como texto em <pre> (sem lib externa).
 */
export function DependencyGraph({ entries }: { entries: CatalogEntry[] }) {
  const mermaid = useMemo(() => buildDependencyMermaid(entries), [entries]);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Grafo em texto Mermaid (leitura). Cole em qualquer viewer para visualização.
      </p>
      <pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-4">
{mermaid}
      </pre>
    </div>
  );
}
