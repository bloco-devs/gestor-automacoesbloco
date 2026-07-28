import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useWorkflows } from "../hooks/useWorkflows";
import { useWorkflowLogs } from "@/modules/workflow-runtime";

/** Card do Centro de Operações com métricas reais da engine. */
export function WorkflowsOpsCard() {
  const { items } = useWorkflows();
  const { data: logs = [] } = useWorkflowLogs(null);
  const active = items.filter((w) => w.enabled).length;

  const stats = useMemo(() => {
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recent = logs.filter((l) => new Date(l.created_at).getTime() >= last24h);
    const ok = recent.filter((l) => l.status === "success").length;
    const failed = recent.filter((l) => l.status === "failed").length;
    return { total: recent.length, ok, failed };
  }, [logs]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Workflow className="size-4 text-primary" />
          Workflows
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{items.length}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {active} ativo{active === 1 ? "" : "s"} · {stats.total} execuç
          {stats.total === 1 ? "ão" : "ões"} em 24h
          {stats.failed > 0 && (
            <span className="text-destructive"> · {stats.failed} com falha</span>
          )}
        </p>
        <p className="text-xs mt-2">
          <Link to="/admin/workflows" className="text-primary hover:underline">
            gerenciar
          </Link>
          {" · "}
          <Link to="/admin/workflows/execucoes" className="text-primary hover:underline">
            ver execuções
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
