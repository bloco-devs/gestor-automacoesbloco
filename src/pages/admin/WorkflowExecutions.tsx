import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkflowLogs } from "@/modules/workflow-runtime";
import { useWorkflows } from "@/modules/workflow-builder/hooks/useWorkflows";
import { AlertCircle, CheckCircle2, MinusCircle, XCircle } from "lucide-react";

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  success: { label: "Sucesso", icon: CheckCircle2, className: "text-success" },
  partial: { label: "Parcial", icon: AlertCircle, className: "text-warning" },
  failed: { label: "Falha", icon: XCircle, className: "text-destructive" },
  skipped: { label: "Ignorado", icon: MinusCircle, className: "text-muted-foreground" },
};

export default function WorkflowExecutionsPage() {
  const { data: logs = [], isLoading } = useWorkflowLogs(null);
  const { items } = useWorkflows();
  const nameOf = (id: string) => items.find((w) => w.id === id)?.name ?? "Workflow removido";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Execuções de Workflows</h1>
        <p className="text-sm text-muted-foreground">
          Últimas 100 execuções registradas pelo motor. Atualiza em tempo real.
        </p>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma execução registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const meta = STATUS_META[log.status] ?? STATUS_META.skipped;
            const Icon = meta.icon;
            return (
              <Card key={log.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className={`size-4 ${meta.className}`} />
                    {nameOf(log.workflow_id)}
                    <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                      {new Date(log.created_at).toLocaleString("pt-BR")} · {log.duration_ms}ms
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {log.demand_id ? `Demanda ${log.demand_id.slice(0, 8)}…` : "Execução avulsa"}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
