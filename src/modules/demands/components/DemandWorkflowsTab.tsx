import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useWorkflowLogs } from "@/modules/workflow-runtime";
import { useWorkflows } from "@/modules/workflow-builder/hooks/useWorkflows";
import { AlertCircle, CheckCircle2, MinusCircle, XCircle } from "lucide-react";

interface Props {
  demandId: string;
}

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  success: { label: "Sucesso", icon: CheckCircle2, className: "text-success" },
  partial: { label: "Parcial", icon: AlertCircle, className: "text-warning" },
  failed: { label: "Falha", icon: XCircle, className: "text-destructive" },
  skipped: { label: "Ignorado", icon: MinusCircle, className: "text-muted-foreground" },
};

export function DemandWorkflowsTab({ demandId }: Props) {
  const { data: logs = [], isLoading } = useWorkflowLogs(demandId);
  const { items } = useWorkflows();

  const nameOf = (id: string) => items.find((w) => w.id === id)?.name ?? "Workflow removido";

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando execuções…</div>;
  }
  if (!logs.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum workflow foi executado para esta demanda ainda.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const meta = STATUS_META[log.status] ?? STATUS_META.skipped;
        const Icon = meta.icon;
        const result = log.execution_result as { outcomes?: Array<{ actionType: string; status: string; message?: string }> };
        return (
          <Card key={log.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${meta.className}`} />
                <span className="font-medium text-sm">{nameOf(log.workflow_id)}</span>
                <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString("pt-BR")} · {log.duration_ms}ms
              </span>
            </div>
            {result.outcomes && result.outcomes.length > 0 && (
              <ul className="text-xs text-muted-foreground pl-6 list-disc space-y-0.5">
                {result.outcomes.map((o, i) => (
                  <li key={i}>
                    <span className="font-mono">{o.actionType}</span> — {o.status}
                    {o.message ? ` · ${o.message}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
