import { useAiSdkDiagnostics } from "../hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const KIND_LABEL: Record<string, string> = {
  skill: "Skills",
  prompt: "Prompts",
  tool: "Tools",
  "context-builder": "Context",
  agent: "Agents",
  "memory-provider": "Memory",
  router: "Routers",
};

const HEALTH_TONE: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-500",
  degraded: "bg-amber-500/15 text-amber-500",
  down: "bg-red-500/15 text-red-500",
  unknown: "bg-muted text-muted-foreground",
};

export default function AiSdkPanel() {
  const d = useAiSdkDiagnostics();
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Extensões" value={d.registry.total} />
        <Stat label="Plugins" value={Object.keys(d.registry.byPlugin).length} />
        <Stat label="Health OK" value={d.health.filter((h) => h.health === "ok").length} />
        <Stat label="Chamadas" value={Object.values(d.usage).reduce((s, n) => s + n, 0)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Registro por tipo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(d.registry.byKind).map(([k, n]) => (
            <Badge key={k} variant="outline" className="text-xs">
              {KIND_LABEL[k] ?? k}: {n}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {d.health.length === 0 && (
            <p className="text-muted-foreground">Nenhuma extensão registrada.</p>
          )}
          {d.health.slice(0, 30).map((h) => (
            <div key={`${h.kind}:${h.id}`} className="flex items-center justify-between gap-2">
              <span className="font-mono truncate">{h.kind}:{h.id}</span>
              <span className={`rounded px-2 py-0.5 ${HEALTH_TONE[h.health]}`}>{h.health}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {Object.keys(d.versions).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Versões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {Object.entries(d.versions).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="font-mono">{k}</span>
                <Badge variant="outline">v{v}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {Object.keys(d.usage).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {Object.entries(d.usage)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 20)
              .map(([k, n]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="font-mono truncate">{k}</span>
                  <span className="text-muted-foreground">{n}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
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
