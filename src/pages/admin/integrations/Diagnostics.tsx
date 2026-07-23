import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { getIntegrationDiagnostics } from "@/modules/integrations";
import { collectPerformance, collectRuntimeHealth } from "@/modules/platform-health";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function DiagnosticsPage() {
  const diag = useMemo(() => getIntegrationDiagnostics(), []);
  const perf = useMemo(() => collectPerformance(), []);
  const runtimes = useMemo(() => collectRuntimeHealth(), []);

  return (
    <IntegrationShell title="Integration Diagnostics" description="Timeouts, retries, fallbacks, latência, disponibilidade e health score.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
        <StatCard label="Timeouts" value={diag.timeouts} tone={diag.timeouts ? "warning" : "neutral"} />
        <StatCard label="Retries" value={diag.retries} tone="info" />
        <StatCard label="Fallbacks" value={diag.fallbacks} />
        <StatCard label="Fila (traces)" value={diag.queueDepth} />
        <StatCard label="Erros" value={diag.errors} tone={diag.errors ? "danger" : "neutral"} />
        <StatCard label="Health score" value={diag.healthScore} tone={diag.healthScore >= 90 ? "success" : diag.healthScore >= 70 ? "warning" : "danger"} />
        <StatCard label="Latência média" value={`${diag.avgLatencyMs}ms`} />
        <StatCard label="Disponibilidade" value={`${diag.availabilityPct}%`} tone="success" />
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b"><h2 className="ds-h3">Performance por camada</h2></div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr><th className="text-left p-2">Camada</th><th className="text-left p-2">Média (ms)</th><th className="text-left p-2">p95 (ms)</th><th className="text-left p-2">p99 (ms)</th></tr>
          </thead>
          <tbody>
            {perf.map((p) => (
              <tr key={p.label} className="border-t">
                <td className="p-2">{p.label}</td>
                <td className="p-2">{p.avgMs}</td>
                <td className="p-2">{p.p95Ms}</td>
                <td className="p-2">{p.p99Ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="ds-h3 mb-2">Runtimes</h2>
        <ul className="grid gap-2 md:grid-cols-2 text-sm">
          {runtimes.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded border p-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.label}</div>
                <div className="text-xs text-muted-foreground truncate">{r.detail}</div>
              </div>
              <span className={
                r.status === "green" ? "text-success" :
                r.status === "amber" ? "text-warning" : "text-destructive"
              }>{r.status}</span>
            </li>
          ))}
        </ul>
      </Card>
    </IntegrationShell>
  );
}
