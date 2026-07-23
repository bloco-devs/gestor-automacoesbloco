import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { getWebhookTelemetry } from "@/modules/integrations";
import { StatCard } from "@/design-system/patterns/StatCard";

const TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  healthy: "success",
  degraded: "warning",
  failed: "danger",
  unknown: "neutral",
};

export default function WebhookCenter() {
  const rows = useMemo(() => getWebhookTelemetry(), []);
  const failed = rows.filter((r) => r.status === "failed").length;
  const retries = rows.reduce((s, r) => s + r.retries24h, 0);
  const attempts = rows.reduce((s, r) => s + r.attempts24h, 0);

  return (
    <IntegrationShell title="Webhook Center" description="Entradas, saídas, retries e destino — leitura do dispatcher oficial.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Registrados" value={rows.length} />
        <StatCard label="Falhas 24h" value={failed} tone={failed ? "danger" : "neutral"} />
        <StatCard label="Retries 24h" value={retries} tone="warning" />
        <StatCard label="Tentativas 24h" value={attempts} tone="info" />
      </section>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Webhook</th>
              <th className="text-left p-2">Direção</th>
              <th className="text-left p-2">Destino</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Tent.</th>
              <th className="text-left p-2">Falhas</th>
              <th className="text-left p-2">Retries</th>
              <th className="text-left p-2">Último</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t">
                <td className="p-2 font-mono">{w.name}</td>
                <td className="p-2">{w.direction === "in" ? "entrada" : "saída"}</td>
                <td className="p-2 truncate max-w-[280px]" title={w.destination}>{w.destination}</td>
                <td className="p-2">
                  <Badge variant="outline" className={
                    TONE[w.status] === "success" ? "text-success" :
                    TONE[w.status] === "warning" ? "text-warning" :
                    TONE[w.status] === "danger" ? "text-destructive" : ""
                  }>{w.status}</Badge>
                </td>
                <td className="p-2">{w.attempts24h}</td>
                <td className="p-2">{w.failures24h}</td>
                <td className="p-2">{w.retries24h}</td>
                <td className="p-2">{w.lastAttemptAt ? new Date(w.lastAttemptAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Nenhum webhook registrado.</td></tr>}
          </tbody>
        </table>
      </Card>
      <p className="ds-caption text-muted-foreground">
        Este painel é uma superfície de leitura. Cadastro e edição de webhooks continuam em <code>/admin/configuracoes/webhooks</code>.
      </p>
    </IntegrationShell>
  );
}
