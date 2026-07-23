/**
 * OrchestratorPanel — Sandbox diagnostics for the AI Orchestrator.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useOrchestratorChains,
  useOrchestratorDiagnostics,
  useOrchestratorExtensions,
  useOrchestratorPlans,
} from "../hooks";

export default function OrchestratorPanel() {
  const diag = useOrchestratorDiagnostics();
  const exts = useOrchestratorExtensions();
  const plans = useOrchestratorPlans();
  const chains = useOrchestratorChains();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Orchestrator · Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Planners: {diag.extensions.planners}</Badge>
            <Badge variant="outline">Selectors: {diag.extensions.selectors}</Badge>
            <Badge variant="outline">Pipelines: {diag.extensions.pipelines}</Badge>
            <Badge variant="outline">Policies: {diag.extensions.policies}</Badge>
            <Badge variant="secondary">Plans: {diag.recentPlans}</Badge>
            <Badge variant="secondary">Chains: {diag.recentChains}</Badge>
            <Badge variant={diag.successRate >= 0.8 ? "default" : "secondary"}>
              Success: {(diag.successRate * 100).toFixed(0)}%
            </Badge>
            <Badge variant="outline">Avg: {diag.avgDurationMs.toFixed(1)}ms</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Policies disponíveis: {diag.policies.join(", ")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extensões registradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {exts.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma extensão registrada.</p>
          ) : (
            exts.map((e) => (
              <div
                key={`${e.kind}:${e.id}`}
                className="flex items-center justify-between rounded-md border border-border p-2"
              >
                <span className="font-mono text-xs">
                  {e.kind} · {e.id}
                </span>
                <Badge variant="outline">{e.pluginId}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution Plans recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs font-mono">
          {plans.length === 0 ? (
            <p className="text-muted-foreground font-sans">Nenhum plano recente.</p>
          ) : (
            plans
              .slice()
              .reverse()
              .slice(0, 8)
              .map((p) => (
                <div key={p.id} className="rounded border border-border p-2">
                  <div>
                    {p.id} · policy={p.policy} · agent={p.agent?.id ?? "–"} ·
                    skills={p.skills.length} · tools={p.tools.length}
                  </div>
                  <div className="text-muted-foreground">
                    conf={p.confidence.toFixed(2)} · cost={p.estimatedCost.toFixed(2)} ·
                    reason={p.reason ?? "–"}
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution Chains (timeline)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {chains.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma execução registrada.</p>
          ) : (
            chains
              .slice()
              .reverse()
              .slice(0, 6)
              .map((c) => (
                <div key={c.id} className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{c.id}</span>
                    <Badge
                      variant={
                        c.status === "ok"
                          ? "default"
                          : c.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {c.status} · {c.totalDurationMs?.toFixed(1) ?? "–"}ms
                    </Badge>
                  </div>
                  <Separator className="my-1" />
                  <ul className="space-y-0.5 font-mono">
                    {c.steps.map((s, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span>
                          {s.spec.kind}
                          {s.spec.refId ? `:${s.spec.refId}` : ""}
                        </span>
                        <span className="text-muted-foreground">
                          {s.status} · {s.durationMs?.toFixed(1) ?? "–"}ms
                          {s.error ? ` · ${s.error}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
