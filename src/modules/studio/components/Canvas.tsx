import { memo, useCallback, useRef } from "react";
import type { StudioDocument, StudioViewport } from "../types";
import { CanvasNode } from "./CanvasNode";
import { cn } from "@/lib/utils";

interface Props {
  doc: StudioDocument;
  viewport: StudioViewport;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddTo: (parentId: string, type: string, index?: number) => void;
  onMoveTo: (id: string, parentId: string, index?: number) => void;
}

const WIDTH: Record<string, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[720px]",
  lg: "max-w-[1024px]",
  xl: "max-w-full",
};

function CanvasInner({ doc, viewport, selectedId, onSelect, onAddTo, onMoveTo }: Props) {
  const draggedNode = useRef<string | null>(null);

  const handleDropInto = useCallback(
    (parentId: string, index?: number) => {
      const nodeId = draggedNode.current;
      draggedNode.current = null;
      if (nodeId) onMoveTo(nodeId, parentId, index);
    },
    [onMoveTo],
  );

  const handleRootDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/x-studio-type");
      if (type) {
        onAddTo(doc.root.id, type);
        return;
      }
      const nodeId = e.dataTransfer.getData("application/x-studio-node");
      if (nodeId) onMoveTo(nodeId, doc.root.id);
    },
    [doc.root.id, onAddTo, onMoveTo],
  );

  return (
    <div
      className={cn(
        "h-full overflow-auto p-6 bg-muted/20",
        viewport.theme === "dark" ? "dark bg-slate-950" : "",
      )}
      onClick={() => onSelect(null)}
    >
      <div
        className={cn(
          "mx-auto bg-background border rounded-lg shadow-sm transition-all",
          WIDTH[viewport.breakpoint] ?? "max-w-full",
          viewport.grid ? "[background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:16px_16px]" : "",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = e.dataTransfer.types.includes("application/x-studio-type")
            ? "copy"
            : "move";
        }}
        onDrop={handleRootDrop}
        role="region"
        aria-label="Área de edição do Studio"
      >
        <CanvasNode
          node={doc.root}
          selectedId={selectedId}
          onSelect={onSelect}
          onDropInto={handleDropInto}
          onDragNode={(id) => (draggedNode.current = id)}
          breakpoint={viewport.breakpoint}
        />
      </div>
    </div>
  );
}

export const Canvas = memo(CanvasInner);
