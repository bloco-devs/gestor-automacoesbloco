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
 * Custom edge whose entire path acts as a draggable control point. Dragging
 * anywhere along the line bends the curve toward the cursor. When no manual
 * curvature is set, bidirectional connections auto-bend to opposite sides.
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
  const dragging = useRef(false);

  const hasReverse = useStore((s) =>
    s.edges.some((e) => e.source === target && e.target === source),
  );

  const mx = (sourceX + targetX) / 2;
  const my = (sourceY + targetY) / 2;

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

  // Quadratic midpoint for label placement
  const midX = (sourceX + 2 * cx + targetX) / 4;
  const midY = (sourceY + 2 * cy + targetY) / 4;

  const finalStyle = selected
    ? { ...style, strokeWidth: ((style?.strokeWidth as number) ?? 2) + 1 }
    : style;

  const computeOffset = useCallback(
    (clientX: number, clientY: number) => {
      const pos = screenToFlowPosition({ x: clientX, y: clientY });
      // To make a quadratic Bezier pass through `pos` at t=0.5, the control
      // point must be: P1 = 2*pos - (P0 + P2) / 2
      const targetCX = 2 * pos.x - (sourceX + targetX) / 2;
      const targetCY = 2 * pos.y - (sourceY + targetY) / 2;
      return { dx: targetCX - mx, dy: targetCY - my };
    },
    [screenToFlowPosition, sourceX, sourceY, targetX, targetY, mx, my],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGPathElement>) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as SVGPathElement).setPointerCapture(e.pointerId);
      dragging.current = true;
      const { dx, dy } = computeOffset(e.clientX, e.clientY);
      d?.onCurvatureDrag?.(id, dx, dy, false);
    },
    [computeOffset, d, id],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGPathElement>) => {
      if (!dragging.current) return;
      e.stopPropagation();
      const { dx, dy } = computeOffset(e.clientX, e.clientY);
      d?.onCurvatureDrag?.(id, dx, dy, false);
    },
    [computeOffset, d, id],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGPathElement>) => {
      if (!dragging.current) return;
      e.stopPropagation();
      try {
        (e.target as SVGPathElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragging.current = false;
      const { dx, dy } = computeOffset(e.clientX, e.clientY);
      d?.onCurvatureDrag?.(id, dx, dy, true);
    },
    [computeOffset, d, id],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      e.stopPropagation();
      d?.onCurvatureDrag?.(id, null, null, true);
    },
    [d, id],
  );

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={finalStyle} />

      {/* Invisible wide hit area for dragging the curve anywhere along its length */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: dragging.current ? "grabbing" : "grab", pointerEvents: "stroke", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />

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
