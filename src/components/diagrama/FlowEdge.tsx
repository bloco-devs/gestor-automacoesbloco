import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  useStore,
  type EdgeProps,
} from "@xyflow/react";

/**
 * Custom edge that auto-curves to avoid overlapping when two solutions have
 * connections in both directions. The curve side is deterministic based on
 * the node ids so the two edges bend to opposite sides.
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
}: EdgeProps) {
  const hasReverse = useStore((s) =>
    s.edges.some((e) => e.source === target && e.target === source),
  );

  // Deterministic side: the edge whose source id is "smaller" bends one way,
  // the reverse bends the other. Magnitude scales with distance (clamped).
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const baseOffset = hasReverse ? Math.min(60, Math.max(28, len * 0.18)) : 0;
  const direction = source < target ? 1 : -1;
  const offset = baseOffset * direction;

  const mx = (sourceX + targetX) / 2;
  const my = (sourceY + targetY) / 2;
  // Perpendicular unit vector
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * offset;
  const cy = my + ny * offset;

  const path =
    offset === 0
      ? `M ${sourceX},${sourceY} C ${sourceX + dx * 0.5},${sourceY} ${
          targetX - dx * 0.5
        },${targetY} ${targetX},${targetY}`
      : `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;

  // Label sits along the curve midpoint
  const labelX = offset === 0 ? mx : mx + nx * offset * 0.55;
  const labelY = offset === 0 ? my : my + ny * offset * 0.55;

  const finalStyle = selected
    ? { ...style, strokeWidth: ((style?.strokeWidth as number) ?? 2) + 1 }
    : style;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={finalStyle} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const FlowEdge = memo(FlowEdgeBase);
