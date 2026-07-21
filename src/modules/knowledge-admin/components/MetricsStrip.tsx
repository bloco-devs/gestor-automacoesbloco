import { Card, CardContent } from "@/components/ui/card";
import type { AdminMetrics } from "../types";

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

export function MetricsStrip({ metrics }: { metrics: AdminMetrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Cell label="Total" value={metrics.total} />
      <Cell label="Publicados" value={metrics.publicados} />
      <Cell label="Rascunhos" value={metrics.rascunhos} />
      <Cell label="Em revisão" value={metrics.emRevisao} />
      <Cell label="Arquivados" value={metrics.arquivados} />
      <Cell label="Visualizações" value={metrics.views.toLocaleString("pt-BR")} />
    </div>
  );
}
