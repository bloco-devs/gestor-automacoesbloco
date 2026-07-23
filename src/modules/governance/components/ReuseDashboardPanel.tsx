import { memo, useMemo } from "react";
import { Section } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeReuseBoard } from "../quality/reuse";
import type { ReuseEntry } from "../types";

function List({ items }: { items: ReuseEntry[] }) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground">Sem itens.</p>;
  }
  return (
    <ul className="space-y-1 text-xs">
      {items.map((r) => (
        <li key={`${r.kind}:${r.id}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
          <span className="min-w-0 truncate">{r.label}</span>
          <Badge variant="outline" className="shrink-0 text-[10px]">×{r.reuseCount}</Badge>
        </li>
      ))}
    </ul>
  );
}

export const ReuseDashboardPanel = memo(function ReuseDashboardPanel() {
  const board = useMemo(() => computeReuseBoard(), []);
  return (
    <Section title="Reuse Dashboard" description="Ativos mais reutilizados e candidatos a extração.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(
          [
            { title: "Componentes", data: board.components.slice(0, 6) },
            { title: "Hooks", data: board.hooks.slice(0, 6) },
            { title: "Services", data: board.services.slice(0, 6) },
            { title: "Módulos isolados", data: board.isolated },
          ] as const
        ).map((col) => (
          <Card key={col.title} className="surface-1">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{col.title}</CardTitle></CardHeader>
            <CardContent><List items={col.data} /></CardContent>
          </Card>
        ))}
      </div>
      <Card className="surface-1 mt-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Candidatos a extração</CardTitle></CardHeader>
        <CardContent><List items={board.candidates} /></CardContent>
      </Card>
    </Section>
  );
});
