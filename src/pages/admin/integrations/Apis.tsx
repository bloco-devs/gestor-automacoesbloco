import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { getEdgeFunctionCatalog } from "@/modules/integrations";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function ApiExplorer() {
  const all = useMemo(() => getEdgeFunctionCatalog(), []);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((e) => e.name.toLowerCase().includes(t) || e.description.toLowerCase().includes(t) || e.category.includes(t));
  }, [all, q]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of all) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    return m;
  }, [all]);

  return (
    <IntegrationShell title="API Explorer" description="Edge Functions publicadas — método, categoria, JWT, versão e uso.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Endpoints" value={all.length} tone="info" />
        <StatCard label="Com JWT" value={all.filter((e) => e.verifyJwt).length} />
        <StatCard label="Categorias" value={byCategory.size} />
        <StatCard label="GET/POST" value={`${all.filter((e) => e.method === "GET").length}/${all.filter((e) => e.method === "POST").length}`} />
      </section>

      <Input placeholder="Filtrar por nome, categoria ou descrição…" value={q} onChange={(e) => setQ(e.target.value)} />

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Endpoint</th>
              <th className="text-left p-2">Método</th>
              <th className="text-left p-2">Categoria</th>
              <th className="text-left p-2">JWT</th>
              <th className="text-left p-2">Versão</th>
              <th className="text-left p-2">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.name} className="border-t">
                <td className="p-2 font-mono">{e.name}</td>
                <td className="p-2"><Badge variant="outline">{e.method}</Badge></td>
                <td className="p-2">{e.category}</td>
                <td className="p-2">{e.verifyJwt ? "sim" : "não"}</td>
                <td className="p-2">{e.version}</td>
                <td className="p-2 text-muted-foreground">{e.description}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem resultados.</td></tr>}
          </tbody>
        </table>
      </Card>
    </IntegrationShell>
  );
}
