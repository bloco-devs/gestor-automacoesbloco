import { memo } from "react";
import type { StudioViewport, StudioBreakpoint, StudioTheme } from "../types";
import { Button } from "@/components/ui/button";
import { Toolbar } from "@/design-system";
import { Undo2, Redo2, Monitor, Tablet, Smartphone, Sun, Moon, Grid3x3, Magnet } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  viewport: StudioViewport;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onViewport: (v: Partial<StudioViewport>) => void;
  right?: React.ReactNode;
}

function StudioToolbarInner({ viewport, canUndo, canRedo, onUndo, onRedo, onViewport, right }: Props) {
  const bp = (b: StudioBreakpoint) => ({ variant: viewport.breakpoint === b ? "default" : "outline" } as const);
  const th = (t: StudioTheme) => ({ variant: viewport.theme === t ? "default" : "outline" } as const);

  return (
    <Toolbar className="border-b bg-background px-3 py-2">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={onUndo} disabled={!canUndo} aria-label="Desfazer">
          <Undo2 className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onRedo} disabled={!canRedo} aria-label="Refazer">
          <Redo2 className="size-4" />
        </Button>
        <div className="h-6 w-px bg-border mx-1" />
        <div className="flex items-center gap-1">
          <Button size="icon" {...bp("sm")} onClick={() => onViewport({ breakpoint: "sm" })} aria-label="Mobile">
            <Smartphone className="size-4" />
          </Button>
          <Button size="icon" {...bp("md")} onClick={() => onViewport({ breakpoint: "md" })} aria-label="Tablet">
            <Tablet className="size-4" />
          </Button>
          <Button size="icon" {...bp("lg")} onClick={() => onViewport({ breakpoint: "lg" })} aria-label="Desktop">
            <Monitor className="size-4" />
          </Button>
          <Button size="icon" {...bp("xl")} onClick={() => onViewport({ breakpoint: "xl" })} aria-label="Full">
            <Monitor className={cn("size-4")} />
          </Button>
        </div>
        <div className="h-6 w-px bg-border mx-1" />
        <div className="flex items-center gap-1">
          <Button size="icon" {...th("light")} onClick={() => onViewport({ theme: "light" })} aria-label="Tema claro">
            <Sun className="size-4" />
          </Button>
          <Button size="icon" {...th("dark")} onClick={() => onViewport({ theme: "dark" })} aria-label="Tema escuro">
            <Moon className="size-4" />
          </Button>
        </div>
        <div className="h-6 w-px bg-border mx-1" />
        <Button
          size="icon"
          variant={viewport.grid ? "default" : "outline"}
          onClick={() => onViewport({ grid: !viewport.grid })}
          aria-label="Alternar grid"
        >
          <Grid3x3 className="size-4" />
        </Button>
        <Button
          size="icon"
          variant={viewport.snap ? "default" : "outline"}
          onClick={() => onViewport({ snap: !viewport.snap })}
          aria-label="Alternar snap"
        >
          <Magnet className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </Toolbar>
  );
}

export const StudioToolbar = memo(StudioToolbarInner);
