import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { getInternalApiCatalog } from "@/modules/integrations";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function ApiCatalogPage() {
  const all = useMemo(() => getInternalApiCatalog(), []);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((e) => e.name.toLowerCase().includes(t) || e.domain.toLowerCase().includes(t) || e.description.toLowerCase().includes(t));
  }, [all, q]);
  const grouped = useMemo(() => {
    const m = new Map<string, typeof all>();
    for (const e of filtered) {
      const list = m.get(e.domain) ?? [];
      list.push(e);
      m.set(e.domain, list);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <IntegrationShell title="API Catalog" description="Superfícies internas agrupadas por domínio (rotas, edge functions, serviços e comandos).">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Entradas" value={all.length} />
        <StatCard label="Domínios" value={new Set(all.map((e) => e.domain)).size} tone="info" />
        <StatCard label="Edge Functions" value={all.filter((e) => e.surface === "edge-function").length} />
        <StatCard label="Rotas internas" value={all.filter((e) => e.surface === "internal-route").length} />
      </section>

      <Input placeholder="Filtrar por domínio, nome ou descrição…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map(([domain, items]) => (
          <Card key={domain} className="p-4">
            <h2 className="ds-h3 mb-2">{domain}</h2>
            <ul className="space-y-1 text-sm">
              {items.map((e) => (
                <li key={e.name} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono truncate">{e.name}</div>
                    <div className="ds-caption text-muted-foreground truncate">{e.description}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{e.surface}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </IntegrationShell>
  );
}
