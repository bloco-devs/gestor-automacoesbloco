import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { collectPluginMonitor } from "@/modules/observability";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function PluginExplorer() {
  const rows = useMemo(() => collectPluginMonitor(), []);
  const err = rows.filter((r) => r.status === "error" || r.status === "rejected").length;
  const cmds = rows.reduce((s, r) => s + r.commands, 0);
  const widgets = rows.reduce((s, r) => s + r.widgets, 0);

  return (
    <DeveloperShell title="Plugin Explorer" description="Lifecycle, comandos, widgets e rotas de plugins carregados.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Plugins" value={rows.length} />
        <StatCard label="Erros" value={err} tone={err ? "danger" : "neutral"} />
        <StatCard label="Comandos" value={cmds} tone="info" />
        <StatCard label="Widgets" value={widgets} />
      </section>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Plugin</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Versão</th>
              <th className="text-left p-2">Comandos</th>
              <th className="text-left p-2">Widgets</th>
              <th className="text-left p-2">Rotas</th>
              <th className="text-left p-2">Init (ms)</th>
              <th className="text-left p-2">Erro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-mono">{p.id}</td>
                <td className="p-2"><Badge variant="outline">{p.status}</Badge></td>
                <td className="p-2">{p.version ?? "—"}</td>
                <td className="p-2">{p.commands}</td>
                <td className="p-2">{p.widgets}</td>
                <td className="p-2">{p.routes}</td>
                <td className="p-2">{p.initMs ?? "—"}</td>
                <td className="p-2 text-destructive truncate max-w-[240px]" title={p.error}>{p.error ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Nenhum plugin carregado.</td></tr>}
          </tbody>
        </table>
      </Card>
    </DeveloperShell>
  );
}
