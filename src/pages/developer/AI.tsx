import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { collectAiRuntime } from "@/modules/observability";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function AIDiagnostics() {
  const ai = useMemo(() => collectAiRuntime(), []);

  return (
    <DeveloperShell title="AI Diagnostics" description="Skills, agents, prompts, planos e chains — via AI SDK e Orchestrator.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Skills" value={ai.skills} />
        <StatCard label="Agents" value={ai.agents} />
        <StatCard label="Tools" value={ai.tools} />
        <StatCard label="Prompts" value={ai.prompts} />
        <StatCard label="Planners" value={ai.planners} />
        <StatCard label="Selectors" value={ai.selectors} />
        <StatCard label="Policies" value={ai.policies} />
        <StatCard label="Pipelines" value={ai.pipelines} />
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="ds-h3 mb-2">Execução</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Plans</dt><dd>{ai.plans}</dd></div>
            <div><dt className="text-muted-foreground">Chains</dt><dd>{ai.chains}</dd></div>
            <div><dt className="text-muted-foreground">Success rate</dt><dd>{(ai.successRate * 100).toFixed(1)}%</dd></div>
            <div><dt className="text-muted-foreground">Avg duration</dt><dd>{ai.avgDurationMs.toFixed(0)}ms</dd></div>
          </dl>
        </Card>
        <Card className="p-4">
          <h2 className="ds-h3 mb-2">Custos estimados</h2>
          <p className="text-sm text-muted-foreground">
            Estimativa via <code>estimateTokens</code> (≈4 chars/token). Uso real por request está em <code>/observabilidade-ia</code>.
          </p>
        </Card>
      </div>
    </DeveloperShell>
  );
}
