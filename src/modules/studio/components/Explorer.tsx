import { memo, useMemo, useState } from "react";
import { STUDIO_COMPONENTS, type StudioComponentSpec } from "../registry/components";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  onAdd: (type: string) => void;
}

function ExplorerInner({ onAdd }: Props) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? STUDIO_COMPONENTS.filter(
          (c) => c.label.toLowerCase().includes(term) || c.id.toLowerCase().includes(term),
        )
      : STUDIO_COMPONENTS;
    const byGroup: Record<string, StudioComponentSpec[]> = {};
    for (const c of filtered) (byGroup[c.group] ??= []).push(c);
    return byGroup;
  }, [q]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <p className="ds-h3">Componentes</p>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar componente…"
          aria-label="Buscar componente"
        />
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="ds-caption uppercase text-muted-foreground mb-2">{group}</p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-studio-type", c.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onAdd(c.id)}
                  className={cn(
                    "text-left p-2 border rounded-md bg-card hover:bg-accent hover:text-accent-foreground",
                    "transition-colors text-sm",
                  )}
                  aria-label={`Adicionar ${c.label}`}
                >
                  <p className="font-medium truncate">{c.label}</p>
                  <p className="ds-caption text-muted-foreground line-clamp-2">{c.description}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groups).length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Nenhum componente. <Badge variant="outline">tente outro termo</Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const Explorer = memo(ExplorerInner);
