import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { collectWorkflowRuntime } from "@/modules/observability";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function WorkflowDiagnostics() {
  const wf = useMemo(() => collectWorkflowRuntime(), []);

  return (
    <DeveloperShell title="Workflow Diagnostics" description="Triggers, actions, hooks e execuções do Workflow SDK.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Triggers" value={wf.triggers} />
        <StatCard label="Conditions" value={wf.conditions} />
        <StatCard label="Actions" value={wf.actions} />
        <StatCard label="Validators" value={wf.validators} />
        <StatCard label="Transformers" value={wf.transformers} />
        <StatCard label="Hooks" value={wf.hooks} />
        <StatCard label="Total" value={wf.total} tone="info" />
      </section>
      <Card className="p-4 text-sm text-muted-foreground">
        Métricas de execução (retry/cancel/latency) vivem em <code>/admin/observability</code>. Este painel
        é focado em <em>catálogo</em> de extensões carregadas via SDK.
      </Card>
    </DeveloperShell>
  );
}
