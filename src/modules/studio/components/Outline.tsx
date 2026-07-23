import { memo } from "react";
import type { StudioNode } from "../types";
import { findComponentSpec } from "../registry/components";
import { cn } from "@/lib/utils";

interface Props {
  root: StudioNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function Line({ node, depth, selectedId, onSelect }: { node: StudioNode; depth: number } & Omit<Props, "root">) {
  const spec = findComponentSpec(node.type);
  const isSelected = selectedId === node.id;
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          "w-full text-left px-2 py-1 rounded text-sm hover:bg-accent hover:text-accent-foreground",
          isSelected ? "bg-primary/10 text-primary" : "",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        aria-current={isSelected}
      >
        <span className="font-medium">{spec?.label ?? node.type}</span>
        <span className="ds-caption text-muted-foreground ml-2">{node.id.slice(0, 6)}</span>
      </button>
      {node.children?.map((c) => (
        <Line key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function OutlineInner({ root, selectedId, onSelect }: Props) {
  return (
    <div className="p-2">
      <p className="ds-caption uppercase text-muted-foreground px-2 mb-2">Outline</p>
      <Line node={root} depth={0} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}

export const Outline = memo(OutlineInner);
