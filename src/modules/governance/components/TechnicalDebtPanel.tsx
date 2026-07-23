import { memo, useMemo } from "react";
import { Section } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TECHNICAL_DEBT } from "../quality/technicalDebt";

export const TechnicalDebtPanel = memo(function TechnicalDebtPanel() {
  const byModule = useMemo(() => {
    const map = new Map<string, typeof TECHNICAL_DEBT>();
    for (const item of TECHNICAL_DEBT) {
      const list = map.get(item.module) ?? [];
      list.push(item);
      map.set(item.module, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  return (
    <Section title="Technical Debt" description="Rastreio manual de riscos, pendências e roadmaps.">
      <div className="grid gap-3 md:grid-cols-2">
        {byModule.map(([mod, items]) => (
          <Card key={mod} className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm capitalize">
                {mod}
                <Badge variant="secondary" className="ml-auto text-[10px]">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {items.map((it, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 text-[10px] uppercase">{it.kind}</Badge>
                    <div className="min-w-0">
                      <div className="text-foreground">{it.message}</div>
                      {it.path && <div className="text-[10px] text-muted-foreground">{it.path}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
});
