import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { getConnectorCatalog } from "@/modules/integrations";
import { StatCard } from "@/design-system/patterns/StatCard";

const TONE: Record<string, "success" | "warning" | "neutral"> = {
  active: "success",
  catalog: "neutral",
  planned: "warning",
};

export default function ConnectorHub() {
  const rows = useMemo(() => getConnectorCatalog(), []);
  const active = rows.filter((c) => c.status === "active").length;
  const planned = rows.filter((c) => c.status === "planned").length;
  const kinds = new Set(rows.map((c) => c.kind)).size;

  return (
    <IntegrationShell title="Connector Hub" description="Catálogo oficial de conectores — status, tipo e propósito.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Conectores" value={rows.length} />
        <StatCard label="Ativos" value={active} tone="success" />
        <StatCard label="Planejados" value={planned} tone="warning" />
        <StatCard label="Tipos" value={kinds} tone="info" />
      </section>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium">{c.name}</h3>
              <Badge variant="outline" className={
                TONE[c.status] === "success" ? "text-success" :
                TONE[c.status] === "warning" ? "text-warning" : ""
              }>{c.status}</Badge>
            </div>
            <p className="ds-caption text-muted-foreground uppercase tracking-wide">{c.kind}</p>
            <p className="text-sm mt-2">{c.description}</p>
          </Card>
        ))}
      </div>
    </IntegrationShell>
  );
}
