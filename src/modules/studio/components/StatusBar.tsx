import { memo, useMemo } from "react";
import type { StudioDocument, StudioViewport } from "../types";

function countNodes(root: StudioDocument["root"]): number {
  let n = 1;
  for (const c of root.children ?? []) n += countNodes(c);
  return n;
}

function StatusBarInner({ doc, viewport }: { doc: StudioDocument; viewport: StudioViewport }) {
  const total = useMemo(() => countNodes(doc.root), [doc.root]);
  return (
    <div className="border-t bg-muted/30 px-3 py-1.5 flex items-center gap-4 text-xs text-muted-foreground">
      <span>
        <strong className="text-foreground">{doc.name}</strong> · v{doc.version}
      </span>
      <span>Nós: {total}</span>
      <span>Bindings: {Object.keys(doc.bindings).length}</span>
      <span>Breakpoint: {viewport.breakpoint}</span>
      <span>Tema: {viewport.theme}</span>
      <span className="ml-auto">Autosave em localStorage</span>
    </div>
  );
}

export const StatusBar = memo(StatusBarInner);
