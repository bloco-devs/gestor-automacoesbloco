import { memo } from "react";
import type { StudioDocument, StudioViewport } from "../types";
import { CanvasNode } from "./CanvasNode";
import { cn } from "@/lib/utils";

const WIDTH: Record<string, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[720px]",
  lg: "max-w-[1024px]",
  xl: "max-w-full",
};

function PreviewRuntimeInner({ doc, viewport }: { doc: StudioDocument; viewport: StudioViewport }) {
  return (
    <div className={cn("h-full overflow-auto p-6 bg-muted/20", viewport.theme === "dark" ? "dark bg-slate-950" : "")}>
      <div className={cn("mx-auto bg-background border rounded-lg shadow-sm", WIDTH[viewport.breakpoint])}>
        <CanvasNode
          node={doc.root}
          selectedId={null}
          onSelect={() => {}}
          onDropInto={() => {}}
          onDragNode={() => {}}
          breakpoint={viewport.breakpoint}
        />
      </div>
    </div>
  );
}

export const PreviewRuntime = memo(PreviewRuntimeInner);
