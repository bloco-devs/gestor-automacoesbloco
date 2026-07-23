import { memo, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { PageShell, PageHeader, Section, Toolbar, EmptyPanel } from "@/design-system";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { collectPermissionTree, type PermissionNode } from "@/modules/security";

function SecurityPermissionsPageImpl() {
  const nodes = useMemo(() => collectPermissionTree(), []);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return nodes.filter((n) => {
      if (kind !== "all" && n.kind !== kind) return false;
      if (!query) return true;
      return `${n.label} ${n.detail ?? ""}`.toLowerCase().includes(query);
    });
  }, [nodes, q, kind]);

  const grouped = useMemo(() => {
    const g = new Map<string, PermissionNode[]>();
    for (const n of filtered) {
      const key = n.parentId ?? n.kind;
      const arr = g.get(key) ?? [];
      arr.push(n);
      g.set(key, arr);
    }
    return g;
  }, [filtered]);

  return (
    <PageShell>
      <PageHeader title="Permission Explorer" subtitle="Roles, capabilities, plugins, extensões e agentes." icon={<Users className="h-6 w-6" aria-hidden />} />
      <Section title="Árvore de permissões">
        <Toolbar className="mb-3">
          <Input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <select className="border rounded-md px-2 py-1 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">Todos</option>
            <option value="role">Roles</option>
            <option value="plugin">Plugins</option>
            <option value="capability">Capabilities</option>
          </select>
        </Toolbar>

        {filtered.length === 0 ? (
          <EmptyPanel title="Sem itens" description="Nenhum nó encontrado com este filtro." />
        ) : (
          <div className="rounded-2xl border divide-y">
            {Array.from(grouped.entries()).map(([key, list]) => (
              <div key={key} className="p-3">
                <div className="ds-caption text-muted-foreground mb-1">{key}</div>
                <div className="flex flex-wrap gap-2">
                  {list.map((n) => (
                    <Badge key={n.id} variant="outline" title={n.detail}>
                      <span className="mr-2 text-muted-foreground">{n.kind}</span>{n.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </PageShell>
  );
}

export default memo(SecurityPermissionsPageImpl);
