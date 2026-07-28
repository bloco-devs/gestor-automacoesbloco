import { memo } from "react";
import { ArrowDown } from "lucide-react";
import { Section } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MAIN_CHAIN, MODULE_EDGES } from "../catalog/dependencyMap";
import { MODULES } from "../catalog/inventory";

export const DependencyMapPanel = memo(function DependencyMapPanel() {
  const byId = new Map(MODULES.map((m) => [m.id, m]));
  return (
    <Section title="Dependency Map" description="Cadeia principal e relações entre módulos.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="surface-1">
          <CardContent className="pt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Cadeia principal</div>
            <ol className="space-y-1 text-sm">
              {MAIN_CHAIN.map((id, i) => (
                <li key={id} className="flex items-center gap-2">
                  <div className="rounded border bg-muted/40 px-2 py-1 text-xs">
                    {byId.get(id)?.label ?? id}
                  </div>
                  {i < MAIN_CHAIN.length - 1 && (
                    <ArrowDown className="size-3.5 text-muted-foreground" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card className="surface-1">
          <CardContent className="pt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Arestas ({MODULE_EDGES.length})</div>
            <ul className="max-h-80 overflow-auto text-xs">
              {MODULE_EDGES.map((e) => (
                <li key={`${e.from}->${e.to}`} className="flex items-center justify-between border-b py-1 last:border-b-0">
                  <span>
                    <span className="font-medium">{byId.get(e.from)?.label ?? e.from}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span>{byId.get(e.to)?.label ?? e.to}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px]">força {e.strength}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
});
