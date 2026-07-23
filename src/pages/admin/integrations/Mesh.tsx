import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { collectMeshTimeline, buildMermaidGraph } from "@/modules/observability";
import { meshEventHistory } from "@/platform-sdk/services/diagnostics";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function MeshGateway() {
  const rows = useMemo(() => collectMeshTimeline(), []);
  const events = useMemo(() => meshEventHistory().slice(-30).reverse(), []);
  const graph = useMemo(() => buildMermaidGraph(), []);

  return (
    <IntegrationShell title="Service Mesh Gateway" description="Contratos, providers, consumers e dependência entre módulos.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Contratos" value={rows.length} />
        <StatCard label="Providers" value={rows.reduce((s, r) => s + r.providers, 0)} tone="info" />
        <StatCard label="Eventos" value={events.length} />
        <StatCard label="Health verdes" value={rows.filter((r) => r.health === "healthy" || r.health === "ok").length} tone="success" />
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b"><h2 className="ds-h3">Contratos registrados</h2></div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Contrato</th>
              <th className="text-left p-2">Providers</th>
              <th className="text-left p-2">Versão</th>
              <th className="text-left p-2">Health</th>
              <th className="text-left p-2">Último evento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.contract} className="border-t">
                <td className="p-2 font-mono">{r.contract}</td>
                <td className="p-2">{r.providers}</td>
                <td className="p-2">{r.version ?? "—"}</td>
                <td className="p-2"><Badge variant="outline">{r.health ?? "—"}</Badge></td>
                <td className="p-2">{r.lastEvent ? new Date(r.lastEvent).toLocaleTimeString() : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum contrato registrado.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="ds-h3 mb-2">Grafo de dependências</h2>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{graph}</pre>
      </Card>
    </IntegrationShell>
  );
}
