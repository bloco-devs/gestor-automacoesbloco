import { useEventSdkDiagnostics } from "../hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EventSdkPanel() {
  const d = useEventSdkDiagnostics();
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Extensões" value={d.registry.total} />
        <Stat label="Publicações" value={d.totalDispatched} />
        <Stat label="Canceladas" value={d.totalCancelled} />
        <Stat label="Tempo médio (ms)" value={d.avgDurationMs} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Registro por tipo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(d.registry.byKind).map(([k, n]) => (
            <Badge key={k} variant="outline" className="text-xs">
              {k}: {n}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Eventos recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {d.recentEvents.length === 0 && (
            <p className="text-muted-foreground">Nenhum evento publicado ainda.</p>
          )}
          {d.recentEvents.slice(0, 15).map((e) => (
            <div key={e.envelopeId} className="flex items-center justify-between">
              <span className="font-mono">{e.event}</span>
              <span className="text-muted-foreground">
                {e.cancelled ? "cancelado" : "ok"} ·{" "}
                {new Date(e.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Últimos dispatches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {d.recentDispatches.length === 0 && (
            <p className="text-muted-foreground">Sem dispatches ainda.</p>
          )}
          {d.recentDispatches.slice(0, 10).map((r) => (
            <div key={r.envelopeId} className="flex items-center justify-between">
              <span className="font-mono">{r.event}</span>
              <span className="text-muted-foreground">
                invoked: {r.invoked} · skipped: {r.skipped} · errors:{" "}
                {r.errors.length} · {r.durationMs}ms
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
