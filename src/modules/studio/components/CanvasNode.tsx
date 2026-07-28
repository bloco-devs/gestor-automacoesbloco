/**
 * CanvasNode — render leve dos nós do documento no canvas.
 * Não usa os componentes reais para evitar acoplamento; simula visual.
 */
import { memo, useMemo } from "react";
import type { StudioNode, StudioBreakpoint } from "../types";
import { findComponentSpec } from "../registry/components";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard, KpiRow } from "@/design-system";

interface Props {
  node: StudioNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDropInto: (parentId: string, index?: number) => void;
  onDragNode: (id: string) => void;
  breakpoint: StudioBreakpoint;
}

function resolveProps(node: StudioNode, breakpoint: StudioBreakpoint): Record<string, unknown> {
  const base = node.props ?? {};
  const responsive = node.responsive?.[breakpoint] ?? {};
  return { ...base, ...responsive };
}

function NodeInner({ node, breakpoint, selectedId, onSelect, onDropInto, onDragNode }: Props) {
  const props = useMemo(() => resolveProps(node, breakpoint), [node, breakpoint]);
  const spec = findComponentSpec(node.type);
  const isSelected = selectedId === node.id;

  const wrap = (children: React.ReactNode) => (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData("application/x-studio-node", node.id);
        onDragNode(node.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node.id);
        }
      }}
      className={cn(
        "relative rounded-md outline-none transition-colors",
        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-1 hover:ring-border",
      )}
      data-node-id={node.id}
      aria-label={`${spec?.label ?? node.type} (${node.id})`}
    >
      {children}
    </div>
  );

  const dropZone = (parentId: string, index: number) => (
    <div
      key={`dz-${parentId}-${index}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropInto(parentId, index);
      }}
      className="h-2 w-full rounded transition-colors hover:bg-primary/20"
      aria-hidden
    />
  );

  const renderChildren = () => {
    if (!node.children) return null;
    return (
      <>
        {dropZone(node.id, 0)}
        {node.children.map((child, i) => (
          <div key={child.id}>
            <NodeInner
              node={child}
              breakpoint={breakpoint}
              selectedId={selectedId}
              onSelect={onSelect}
              onDropInto={onDropInto}
              onDragNode={onDragNode}
            />
            {dropZone(node.id, i + 1)}
          </div>
        ))}
      </>
    );
  };

  switch (node.type) {
    case "section":
      return wrap(
        <section className="space-y-3 p-4">
          {props.title ? <h2 className="ds-h2">{String(props.title)}</h2> : null}
          {props.description ? (
            <p className="ds-caption text-muted-foreground">{String(props.description)}</p>
          ) : null}
          <div className="space-y-2">{renderChildren()}</div>
        </section>,
      );
    case "toolbar":
      return wrap(
        <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-card">
          {renderChildren()}
        </div>,
      );
    case "grid": {
      const cols = Math.max(1, Math.min(12, Number(props.columns ?? 3)));
      const gap = Math.max(0, Math.min(10, Number(props.gap ?? 4)));
      return wrap(
        <div
          className="grid p-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: `${gap * 4}px` }}
        >
          {node.children?.map((c) => (
            <NodeInner
              key={c.id}
              node={c}
              breakpoint={breakpoint}
              selectedId={selectedId}
              onSelect={onSelect}
              onDropInto={onDropInto}
              onDragNode={onDragNode}
            />
          ))}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDropInto(node.id, node.children?.length ?? 0);
            }}
            className="min-h-[40px] rounded border border-dashed border-border/60"
            aria-label="Zona de soltar"
          />
        </div>,
      );
    }
    case "card":
      return wrap(
        <Card>
          <CardHeader>
            <CardTitle>{String(props.title ?? "Card")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">{renderChildren()}</CardContent>
        </Card>,
      );
    case "button":
      return wrap(
        <div className="p-2">
          <Button variant={(props.variant as never) ?? "default"}>{String(props.label ?? "Ação")}</Button>
        </div>,
      );
    case "input":
      return wrap(
        <div className="p-2 space-y-1">
          {props.label ? <label className="ds-caption">{String(props.label)}</label> : null}
          <Input placeholder={String(props.placeholder ?? "")} />
        </div>,
      );
    case "stat":
      return wrap(
        <div className="p-2">
          <StatCard label={String(props.label ?? "")} value={String(props.value ?? "")} tone={props.tone as never} />
        </div>,
      );
    case "kpiRow": {
      const items = Array.isArray(props.items) ? (props.items as { label: string; value: unknown }[]) : [];
      return wrap(
        <div className="p-2">
          <KpiRow>
            {items.map((it, i) => (
              <StatCard key={i} label={it.label} value={String(it.value)} />
            ))}
          </KpiRow>
        </div>,
      );
    }
    case "table": {
      const cols = Array.isArray(props.columns) ? (props.columns as string[]) : [];
      const rows = Array.isArray(props.rows) ? (props.rows as unknown[][]) : [];
      return wrap(
        <div className="p-2 overflow-auto">
          <table className="w-full text-sm border rounded-md">
            <thead className="bg-muted/40">
              <tr>
                {cols.map((c, i) => (
                  <th key={i} className="text-left px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length || 1} className="px-3 py-4 text-center text-muted-foreground">
                    Sem dados
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {cols.map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        {String((row as never)?.[j] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>,
      );
    }
    case "timeline": {
      const items = Array.isArray(props.items) ? (props.items as { title: string; when?: string }[]) : [];
      return wrap(
        <div className="p-2 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos.</p>
          ) : (
            items.map((it, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="mt-1 size-2 rounded-full bg-primary" />
                <div>
                  <p className="text-sm">{it.title}</p>
                  {it.when ? <p className="ds-caption text-muted-foreground">{it.when}</p> : null}
                </div>
              </div>
            ))
          )}
        </div>,
      );
    }
    case "kanban": {
      const cols = Array.isArray(props.columns) ? (props.columns as { title: string; cards?: string[] }[]) : [];
      return wrap(
        <div className="p-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols.length || 1},minmax(160px,1fr))` }}>
          {cols.map((c, i) => (
            <div key={i} className="bg-muted/30 rounded-md p-2 border">
              <p className="ds-caption font-medium mb-2">{c.title}</p>
              <div className="space-y-1">
                {(c.cards ?? []).map((t, j) => (
                  <div key={j} className="text-xs bg-background rounded border px-2 py-1">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>,
      );
    }
    case "form":
      return wrap(
        <form className="p-3 space-y-2 border rounded-md">
          <p className="ds-h3">{String(props.title ?? "Formulário")}</p>
          {renderChildren()}
        </form>,
      );
    case "dialog":
      return wrap(
        <div className="p-3 border rounded-md bg-card space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Dialog</Badge>
            <p className="ds-h3">{String(props.title ?? "")}</p>
          </div>
          <div className="space-y-2">{renderChildren()}</div>
        </div>,
      );
    case "chart":
      return wrap(
        <div className="p-2">
          <div className="h-32 rounded-md border border-dashed border-border/70 flex items-center justify-center text-muted-foreground text-sm">
            Gráfico ({String(props.kind ?? "line")})
          </div>
        </div>,
      );
    case "text": {
      const size = String(props.size ?? "base");
      const cls = {
        xs: "text-xs",
        sm: "text-sm",
        base: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
      }[size] ?? "text-base";
      return wrap(<p className={cn("p-2", cls)}>{String(props.content ?? "")}</p>);
    }
    default:
      return wrap(<div className="p-2 text-sm text-muted-foreground">Componente desconhecido: {node.type}</div>);
  }
}

export const CanvasNode = memo(NodeInner);
