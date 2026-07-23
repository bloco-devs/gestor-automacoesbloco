import { useEffect, useMemo, useState } from "react";
import { Activity, Boxes, Cpu, GitBranch, Layers, Radio, ShieldCheck, Waypoints } from "lucide-react";
import { PageShell, PageHeader, Section, KpiRow, StatCard } from "@/design-system";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  collectObservabilityOverview,
  collectMeshTimeline,
  collectPluginMonitor,
  collectAiRuntime,
  collectWorkflowRuntime,
  collectAuditPulse,
  computeEnterpriseScores,
  buildMermaidGraph,
  spanHistory,
  type Span,
} from "@/modules/observability";

function useNow(intervalMs = 4000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function toneForScore(score: number): "success" | "warning" | "danger" | "neutral" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  if (score > 0) return "danger";
  return "neutral";
}

function relTime(ts?: number, now = Date.now()): string {
  if (!ts) return "—";
  const diff = Math.max(0, now - ts);
  if (diff < 1000) return "agora";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`;
  return `${Math.floor(diff / 3_600_000)}h`;
}

export default function ObservabilityCenterPage() {
  const now = useNow();
  const overview = useMemo(() => collectObservabilityOverview(), [now]);
  const scores = useMemo(() => computeEnterpriseScores(), [now]);
  const mesh = useMemo(() => collectMeshTimeline(), [now]);
  const plugins = useMemo(() => collectPluginMonitor(), [now]);
  const ai = useMemo(() => collectAiRuntime(), [now]);
  const wf = useMemo(() => collectWorkflowRuntime(), [now]);
  const audit = useMemo(() => collectAuditPulse(), [now]);
  const spans: Span[] = useMemo(() => spanHistory().slice(-25).reverse(), [now]);
  const graph = useMemo(() => buildMermaidGraph(), []);

  return (
    <PageShell maxWidth="full">
      <PageHeader
        title="Observability Center"
        subtitle="Traces, service mesh, plugins, IA, workflows e scores enterprise em tempo real."
        icon={<Activity className="h-6 w-6" />}
      />

      <Section title="Enterprise Scores">
        <KpiRow>
          {scores.map((s) => (
            <StatCard key={s.id} label={s.label} value={s.score} hint={s.detail} tone={toneForScore(s.score)} />
          ))}
        </KpiRow>
      </Section>

      <Section title="Panorama">
        <KpiRow>
          <StatCard label="Runtimes verdes" value={`${overview.runtimesGreen}/${overview.runtimes}`} icon={Cpu} tone="success" />
          <StatCard label="Serviços no Mesh" value={overview.services} icon={Waypoints} tone="info" />
          <StatCard label="Plugins" value={`${overview.plugins - overview.pluginsError}/${overview.plugins}`} icon={Boxes} tone={overview.pluginsError ? "warning" : "success"} />
          <StatCard label="Traces (buffer)" value={overview.traces} icon={GitBranch} tone="neutral" />
          <StatCard label="Erros críticos" value={overview.criticalErrors} icon={ShieldCheck} tone={overview.criticalErrors ? "danger" : "success"} />
          <StatCard label="Mesh events" value={overview.meshEvents} icon={Radio} tone="neutral" />
        </KpiRow>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Service Mesh — timeline">
          <Card className="p-3 max-h-96 overflow-auto">
            {mesh.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serviço publicado.</p>
            ) : (
              <ul className="divide-y">
                {mesh.map((row) => (
                  <li key={row.contract} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.contract}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.providers} provider{row.providers === 1 ? "" : "s"} · v{row.version ?? "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={row.health === "ok" ? "default" : row.health === "degraded" ? "secondary" : "outline"}>
                        {row.health ?? "unknown"}
                      </Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">{relTime(row.lastEvent, now)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>

        <Section title="Distributed Traces">
          <Card className="p-3 max-h-96 overflow-auto">
            {spans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum span registrado no buffer.</p>
            ) : (
              <ul className="divide-y">
                {spans.map((s) => (
                  <li key={s.spanId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.source} · {s.traceId.slice(0, 8)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.status === "ok" ? "default" : s.status === "running" ? "secondary" : "destructive"}>
                        {s.status}
                      </Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {s.durationMs != null ? `${Math.round(s.durationMs)}ms` : "—"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>
      </div>

      <Section title="Runtimes de IA e Workflow">
        <KpiRow>
          <StatCard label="Agentes" value={ai.agents} icon={Layers} tone="info" />
          <StatCard label="Skills" value={ai.skills} tone="neutral" />
          <StatCard label="Tools" value={ai.tools} tone="neutral" />
          <StatCard label="Planos executados" value={ai.plans} hint={`Sucesso ${Math.round(ai.successRate * 100)}%`} tone={toneForScore(ai.successRate * 100)} />
          <StatCard label="Workflow ext." value={wf.total} hint={`${wf.actions} actions · ${wf.triggers} triggers`} tone="neutral" />
          <StatCard label="Auditoria 24h" value={audit.last24h} hint={`${audit.failures} falhas`} tone={audit.failures ? "warning" : "success"} />
        </KpiRow>
      </Section>

      <Section title="Plugin Monitor">
        <Card className="p-3 overflow-auto">
          {plugins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plugin ativo.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Plugin</th>
                  <th>Status</th>
                  <th>Versão</th>
                  <th className="text-right">Commands</th>
                  <th className="text-right">Widgets</th>
                  <th className="text-right">Rotas</th>
                  <th className="text-right">Init</th>
                </tr>
              </thead>
              <tbody>
                {plugins.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 font-medium">{p.id}</td>
                    <td>
                      <Badge variant={p.status === "active" ? "default" : p.status === "error" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">{p.version ?? "—"}</td>
                    <td className="text-right tabular-nums">{p.commands}</td>
                    <td className="text-right tabular-nums">{p.widgets}</td>
                    <td className="text-right tabular-nums">{p.routes}</td>
                    <td className="text-right tabular-nums">{p.initMs != null ? `${Math.round(p.initMs)}ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </Section>

      <Section title="Dependency Graph (Mermaid)">
        <Card className="p-3">
          <pre className="text-xs overflow-auto whitespace-pre">{graph}</pre>
        </Card>
      </Section>
    </PageShell>
  );
}
