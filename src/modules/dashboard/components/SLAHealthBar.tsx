import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DemandMetrics } from "../service";

export function SLAHealthBar({ metrics, loading }: { metrics: DemandMetrics | null; loading: boolean }) {
  if (loading || !metrics) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Saúde do Atendimento (SLA)</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-6 w-full" /></CardContent>
      </Card>
    );
  }

  const total = metrics.noPrazo + metrics.emAlerta + metrics.estouradas;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const pOk = pct(metrics.noPrazo);
  const pAlerta = pct(metrics.emAlerta);
  const pStop = pct(metrics.estouradas);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Saúde do Atendimento (SLA)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-4 w-full overflow-hidden rounded-full border">
          {total === 0 ? (
            <div className="w-full bg-muted" />
          ) : (
            <>
              <div style={{ width: `${pOk}%` }} className="bg-success transition-all" />
              <div style={{ width: `${pAlerta}%` }} className="bg-warning transition-all" />
              <div style={{ width: `${pStop}%` }} className="bg-destructive transition-all" />
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-success" />
            <span className="font-medium">{metrics.noPrazo}</span>
            <span className="text-muted-foreground">no prazo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-warning" />
            <span className="font-medium">{metrics.emAlerta}</span>
            <span className="text-muted-foreground">em alerta</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-destructive" />
            <span className="font-medium">{metrics.estouradas}</span>
            <span className="text-muted-foreground">estouradas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
