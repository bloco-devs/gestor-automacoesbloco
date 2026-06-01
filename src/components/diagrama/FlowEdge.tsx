import { memo, useCallback, useRef } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  useStore,
  type EdgeProps,
} from "@xyflow/react";

type FlowEdgeData = {
  onLabelClick?: (edgeId: string) => void;
  onCurvatureDrag?: (edgeId: string, dx: number | null, dy: number | null, isFinal: boolean) => void;
  curvDX?: number | null;
  curvDY?: number | null;
};

/**
 * Custom edge with a draggable control point so users can freely adjust how
 * the line curves between two solutions. When no manual curvature is set,
 * bidirectional connections auto-bend to opposite sides to avoid overlap.
 */
function FlowEdgeBase({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  markerEnd,
  style,
  selected,
  data,
}: EdgeProps) {
  const d = data as FlowEdgeData | undefined;
  const { screenToFlowPosition } = useReactFlow();
  const dragState = useRef<{ pointerId: number } | null>(null);

  const hasReverse = useStore((s) =>
    s.edges.some((e) => e.source === target && e.target === source),
  );

  const mx = (sourceX + targetX) / 2;
  const my = (sourceY + targetY) / 2;

  // Manual curvature takes precedence; otherwise auto-bend for bidirectional.
  const manual = d?.curvDX != null && d?.curvDY != null;
  let offDX = 0;
  let offDY = 0;

  if (manual) {
    offDX = d!.curvDX as number;
    offDY = d!.curvDY as number;
  } else if (hasReverse) {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.hypot(dx, dy) || 1;
    const baseOffset = Math.min(60, Math.max(28, len * 0.18));
    const direction = source < target ? 1 : -1;
    const nx = -dy / len;
    const ny = dx / len;
    offDX = nx * baseOffset * direction;
    offDY = ny * baseOffset * direction;
  }

  const cx = mx + offDX;
  const cy = my + offDY;

  const path =
    offDX === 0 && offDY === 0
      ? `M ${sourceX},${sourceY} C ${(sourceX + targetX) / 2},${sourceY} ${
          (sourceX + targetX) / 2
        },${targetY} ${targetX},${targetY}`
      : `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;

  // Label and handle sit at the midpoint of the quadratic curve, which is at
  // (P0 + 2*P1 + P2) / 4 for t = 0.5.
  const midX = (sourceX + 2 * cx + targetX) / 4;
  const midY = (sourceY + 2 * cy + targetY) / 4;

  const finalStyle = selected
    ? { ...style, strokeWidth: ((style?.strokeWidth as number) ?? 2) + 1 }
    : style;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = { pointerId: e.pointerId };
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      e.stopPropagation();
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const dx = pos.x - mx;
      const dy = pos.y - my;
      d?.onCurvatureDrag?.(id, dx, dy, false);
    },
    [d, id, mx, my, screenToFlowPosition],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      e.stopPropagation();
      try {
        (e.target as HTMLElement).releasePointerCapture(dragState.current.pointerId);
      } catch {
        /* ignore */
      }
      dragState.current = null;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const dx = pos.x - mx;
      const dy = pos.y - my;
      d?.onCurvatureDrag?.(id, dx, dy, true);
    },
    [d, id, mx, my, screenToFlowPosition],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Reset manual curvature back to default
      d?.onCurvatureDrag?.(id, null, null, true);
    },
    [d, id],
  );

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={finalStyle} />

      {/* Draggable control handle */}
      <EdgeLabelRenderer>
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${cx}px, ${cy}px)`,
            pointerEvents: "all",
            touchAction: "none",
          }}
          className={`nodrag nopan rounded-full border-2 border-primary bg-background shadow-sm cursor-grab active:cursor-grabbing transition-all ${
            selected || manual
              ? "size-3 opacity-100"
              : "size-2.5 opacity-50 hover:opacity-100"
          }`}
          title="Arraste para ajustar a curva. Duplo clique para resetar."
        />
      </EdgeLabelRenderer>

      {label ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d?.onLabelClick?.(id);
            }}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
              pointerEvents: "all",
            }}
            className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm nodrag nopan hover:bg-primary/90 cursor-pointer"
            title="Editar detalhes da integração"
          >
            {label}
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const FlowEdge = memo(FlowEdgeBase);
