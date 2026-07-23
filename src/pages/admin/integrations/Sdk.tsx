import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { collectPluginMonitor, collectAiRuntime, collectWorkflowRuntime } from "@/modules/observability";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function SdkExplorer() {
  const plugins = useMemo(() => collectPluginMonitor(), []);
  const ai = useMemo(() => collectAiRuntime(), []);
  const wf = useMemo(() => collectWorkflowRuntime(), []);

  const commands = plugins.reduce((s, p) => s + p.commands, 0);
  const widgets = plugins.reduce((s, p) => s + p.widgets, 0);
  const routes = plugins.reduce((s, p) => s + p.routes, 0);

  return (
    <IntegrationShell title="SDK Integration Explorer" description="Superfícies expostas pelos SDKs oficiais — plugins, comandos, widgets e skills.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Plugins" value={plugins.length} />
        <StatCard label="Comandos" value={commands} tone="info" />
        <StatCard label="Widgets" value={widgets} />
        <StatCard label="Rotas plugin" value={routes} />
        <StatCard label="AI Skills" value={ai.skills} />
        <StatCard label="Workflow ext." value={wf.total} />
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b"><h2 className="ds-h3">Plugins carregados</h2></div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Plugin</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Versão</th>
              <th className="text-left p-2">Comandos</th>
              <th className="text-left p-2">Widgets</th>
              <th className="text-left p-2">Rotas</th>
              <th className="text-left p-2">Erro</th>
            </tr>
          </thead>
          <tbody>
            {plugins.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-mono">{p.id}</td>
                <td className="p-2"><Badge variant="outline">{p.status}</Badge></td>
                <td className="p-2">{p.version ?? "—"}</td>
                <td className="p-2">{p.commands}</td>
                <td className="p-2">{p.widgets}</td>
                <td className="p-2">{p.routes}</td>
                <td className="p-2 text-destructive truncate max-w-[220px]" title={p.error}>{p.error ?? "—"}</td>
              </tr>
            ))}
            {plugins.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Nenhum plugin carregado.</td></tr>}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="ds-h3 mb-2">AI SDK</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Skills</dt><dd>{ai.skills}</dd></div>
            <div><dt className="text-muted-foreground">Agents</dt><dd>{ai.agents}</dd></div>
            <div><dt className="text-muted-foreground">Tools</dt><dd>{ai.tools}</dd></div>
            <div><dt className="text-muted-foreground">Prompts</dt><dd>{ai.prompts}</dd></div>
          </dl>
        </Card>
        <Card className="p-4">
          <h2 className="ds-h3 mb-2">Workflow SDK</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Triggers</dt><dd>{wf.triggers}</dd></div>
            <div><dt className="text-muted-foreground">Actions</dt><dd>{wf.actions}</dd></div>
            <div><dt className="text-muted-foreground">Conditions</dt><dd>{wf.conditions}</dd></div>
            <div><dt className="text-muted-foreground">Hooks</dt><dd>{wf.hooks}</dd></div>
          </dl>
        </Card>
      </div>
    </IntegrationShell>
  );
}
