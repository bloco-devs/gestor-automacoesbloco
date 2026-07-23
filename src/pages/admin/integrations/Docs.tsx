import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { getDeveloperDocs } from "@/modules/integrations";
import { FileText } from "lucide-react";

export default function DeveloperDocs() {
  const all = useMemo(() => getDeveloperDocs(), []);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((d) => d.title.toLowerCase().includes(t) || d.summary.toLowerCase().includes(t) || d.path.toLowerCase().includes(t) || d.group.toLowerCase().includes(t));
  }, [all, q]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof all>();
    for (const d of filtered) {
      const list = m.get(d.group) ?? [];
      list.push(d);
      m.set(d.group, list);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <IntegrationShell title="Developer Portal" description="Índice pesquisável de documentação de integração, SDKs e contratos.">
      <Input placeholder="Pesquisar docs…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(([group, items]) => (
          <Card key={group} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="ds-h3">{group}</h2>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <ul className="space-y-2 text-sm">
              {items.map((d) => (
                <li key={d.path} className="flex items-start gap-2">
                  <FileText className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="ds-caption text-muted-foreground truncate">{d.summary}</div>
                    <div className="ds-caption text-muted-foreground font-mono truncate">{d.path}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </IntegrationShell>
  );
}
