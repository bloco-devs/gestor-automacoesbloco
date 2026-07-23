import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { collectMeshTimeline } from "@/modules/observability";
import { meshEventHistory } from "@/platform-sdk/services/diagnostics";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function ServicesExplorer() {
  const rows = useMemo(() => collectMeshTimeline(), []);
  const events = useMemo(() => meshEventHistory().slice(-50).reverse(), []);

  return (
    <DeveloperShell title="Service Mesh Explorer" description="Providers, contratos e eventos do Service Mesh.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Contratos" value={rows.length} />
        <StatCard label="Providers totais" value={rows.reduce((s, r) => s + r.providers, 0)} />
        <StatCard label="Eventos" value={events.length} tone="info" />
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b"><h2 className="ds-h3">Contratos registrados</h2></div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr><th className="text-left p-2">Contrato</th><th className="text-left p-2">Providers</th><th className="text-left p-2">Versão</th><th className="text-left p-2">Health</th><th className="text-left p-2">Último evento</th></tr>
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

      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b"><h2 className="ds-h3">Eventos recentes</h2></div>
        <div className="max-h-[40vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr><th className="text-left p-2">Quando</th><th className="text-left p-2">Kind</th><th className="text-left p-2">Contrato</th><th className="text-left p-2">Plugin</th><th className="text-left p-2">Detalhe</th></tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{new Date(e.at).toLocaleTimeString()}</td>
                  <td className="p-2 font-mono">{e.kind}</td>
                  <td className="p-2">{e.contract ?? "—"}</td>
                  <td className="p-2">{e.pluginId ?? "—"}</td>
                  <td className="p-2 truncate max-w-[280px]" title={e.detail}>{e.detail ?? "—"}</td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Sem eventos.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </DeveloperShell>
  );
}
