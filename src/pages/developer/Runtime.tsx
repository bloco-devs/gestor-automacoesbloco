import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { collectRuntimeHealth } from "@/modules/platform-health";
import { collectAiRuntime, collectWorkflowRuntime, collectObservabilityOverview } from "@/modules/observability";
import { StatCard } from "@/design-system/patterns/StatCard";

const TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  green: "success",
  yellow: "warning",
  red: "danger",
};

export default function RuntimeInspector() {
  const health = useMemo(() => collectRuntimeHealth(), []);
  const ai = useMemo(() => collectAiRuntime(), []);
  const wf = useMemo(() => collectWorkflowRuntime(), []);
  const overview = useMemo(() => collectObservabilityOverview(), []);

  return (
    <DeveloperShell title="Runtime Inspector" description="Estado agregado de todos os runtimes registrados na plataforma.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Runtimes" value={`${overview.runtimesGreen}/${overview.runtimes}`} tone="info" />
        <StatCard label="Mesh services" value={overview.services} />
        <StatCard label="AI plans" value={ai.plans} />
        <StatCard label="Workflow ext." value={wf.total} />
      </section>

      <Card className="p-4">
        <h2 className="ds-h3 mb-3">Saúde por runtime</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {health.length === 0 && <p className="text-sm text-muted-foreground">Nenhum runtime registrado.</p>}
          {health.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-md border p-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{h.label ?? h.id}</div>
                <div className="text-xs text-muted-foreground truncate">{h.detail ?? h.id}</div>
              </div>
              <Badge variant="outline" className={`ml-2 ${TONE[h.status] === "success" ? "text-success" : TONE[h.status] === "warning" ? "text-warning" : "text-destructive"}`}>
                {h.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="ds-h3 mb-2">AI Runtime</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Skills</dt><dd>{ai.skills}</dd></div>
            <div><dt className="text-muted-foreground">Agents</dt><dd>{ai.agents}</dd></div>
            <div><dt className="text-muted-foreground">Tools</dt><dd>{ai.tools}</dd></div>
            <div><dt className="text-muted-foreground">Prompts</dt><dd>{ai.prompts}</dd></div>
            <div><dt className="text-muted-foreground">Chains</dt><dd>{ai.chains}</dd></div>
            <div><dt className="text-muted-foreground">Success rate</dt><dd>{(ai.successRate * 100).toFixed(1)}%</dd></div>
          </dl>
        </Card>
        <Card className="p-4">
          <h2 className="ds-h3 mb-2">Workflow Runtime</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Triggers</dt><dd>{wf.triggers}</dd></div>
            <div><dt className="text-muted-foreground">Conditions</dt><dd>{wf.conditions}</dd></div>
            <div><dt className="text-muted-foreground">Actions</dt><dd>{wf.actions}</dd></div>
            <div><dt className="text-muted-foreground">Validators</dt><dd>{wf.validators}</dd></div>
            <div><dt className="text-muted-foreground">Hooks</dt><dd>{wf.hooks}</dd></div>
            <div><dt className="text-muted-foreground">Total</dt><dd>{wf.total}</dd></div>
          </dl>
        </Card>
      </div>
    </DeveloperShell>
  );
}
