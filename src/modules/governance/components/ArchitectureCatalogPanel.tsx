import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Section } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DESIGN_SYSTEM,
  EDGE_FUNCTIONS,
  ENGINES,
  HOOKS,
  MODULES,
  PROVIDERS,
  SERVICES,
} from "../catalog/inventory";
import type { CatalogNode } from "../types";

const GROUPS: Array<{ id: string; label: string; items: CatalogNode[] }> = [
  { id: "modules", label: "Módulos", items: MODULES },
  { id: "engines", label: "Engines", items: ENGINES },
  { id: "hooks", label: "Hooks globais", items: HOOKS },
  { id: "services", label: "Services / lib", items: SERVICES },
  { id: "providers", label: "Providers", items: PROVIDERS },
  { id: "ds", label: "Design System 2.0", items: DESIGN_SYSTEM },
  { id: "edges", label: "Edge Functions", items: EDGE_FUNCTIONS },
];

export const ArchitectureCatalogPanel = memo(function ArchitectureCatalogPanel() {
  const [open, setOpen] = useState<Record<string, boolean>>({ modules: true, engines: true });
  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  return (
    <Section title="Architecture Catalog" description="Árvore navegável dos ativos do sistema.">
      <div className="grid gap-3">
        {GROUPS.map((g) => (
          <Card key={g.id} className="surface-1">
            <CardHeader className="cursor-pointer pb-2" onClick={() => toggle(g.id)}>
              <CardTitle className="flex items-center gap-2 text-sm">
                {open[g.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                {g.label}
                <Badge variant="secondary" className="ml-auto text-[10px]">{g.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            {open[g.id] && (
              <CardContent className="pb-3">
                <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                  {g.items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                      <span className="min-w-0">
                        <div className="truncate font-medium text-foreground">{it.label}</div>
                        {it.path && <div className="truncate text-muted-foreground text-[10px]">{it.path}</div>}
                      </span>
                      {typeof it.reuse === "number" && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">×{it.reuse}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </Section>
  );
});
