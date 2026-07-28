import { useMemo, useState } from "react";
import { Bug } from "lucide-react";
import { PageShell, PageHeader, Section, Toolbar, EmptyPanel } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useErrorHistory, clearErrors, type ErrorSeverity, type ErrorSource } from "@/modules/errors";

const SEVERITY_TONE: Record<ErrorSeverity, "default" | "secondary" | "destructive" | "outline"> = {
  info: "outline",
  warning: "secondary",
  error: "destructive",
  critical: "destructive",
};

export default function ErrorCenterPage() {
  const events = useErrorHistory();
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<ErrorSeverity | "all">("all");
  const [source, setSource] = useState<ErrorSource | "all">("all");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (severity !== "all" && e.severity !== severity) return false;
      if (source !== "all" && e.source !== source) return false;
      if (q && !`${e.message} ${e.detail ?? ""} ${e.pluginId ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [events, q, severity, source]);

  return (
    <PageShell>
      <PageHeader
        title="Error Center"
        subtitle={`${events.length} eventos capturados (ring buffer, últimos 500).`}
        icon={<Bug className="size-6" />}
        actions={
          <Button variant="outline" size="sm" onClick={clearErrors} disabled={!events.length}>
            Limpar buffer
          </Button>
        }
      />

      <Section>
        <Toolbar>
          <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as ErrorSeverity | "all")}
            aria-label="Filtrar por criticidade"
          >
            <option value="all">Todas criticidades</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
            <option value="critical">critical</option>
          </select>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value as ErrorSource | "all")}
            aria-label="Filtrar por origem"
          >
            <option value="all">Todas origens</option>
            {["javascript", "react", "promise", "plugin", "workflow", "routing", "ai", "knowledge", "mesh", "runtime", "unknown"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Toolbar>
      </Section>

      <Section>
        {filtered.length === 0 ? (
          <EmptyPanel title="Sem erros registrados" description="Ótimo sinal. Nenhum evento capturado neste período." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {filtered.map((e) => (
              <li key={e.id} className="p-3 flex items-start gap-3">
                <Badge variant={SEVERITY_TONE[e.severity]} className="uppercase text-[10px]">{e.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.message}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {new Date(e.at).toLocaleString()} · {e.source}
                    {e.pluginId ? ` · ${e.pluginId}` : ""}
                    {e.origin ? ` · ${e.origin}` : ""}
                  </div>
                  {e.detail ? (
                    <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-[11px]">
                      {e.detail}
                    </pre>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </PageShell>
  );
}
