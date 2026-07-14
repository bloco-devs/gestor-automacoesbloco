import { CheckCircle2, Download, AlertTriangle, XCircle } from "lucide-react";
import type { JobRow, RunReport } from "@/lib/importador/types";
import { Button } from "@/components/ui/button";
import { downloadReportJson } from "@/lib/importador/api";

interface Props {
  job: JobRow | null;
  report: RunReport | null;
}

export function StepExecucao({ job, report }: Props) {
  const status = job?.status ?? "queued";
  const isFinal = ["success", "partial", "failed", "cancelled"].includes(status);

  const statusStyles: Record<string, { icon: JSX.Element; text: string; tone: string }> = {
    success: { icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, text: "Concluído com sucesso", tone: "text-emerald-700" },
    partial: { icon: <AlertTriangle className="h-5 w-5 text-amber-600" />, text: "Concluído com avisos", tone: "text-amber-700" },
    failed: { icon: <XCircle className="h-5 w-5 text-destructive" />, text: "Falhou", tone: "text-destructive" },
    cancelled: { icon: <XCircle className="h-5 w-5 text-muted-foreground" />, text: "Cancelado", tone: "text-muted-foreground" },
    running: { icon: <AlertTriangle className="h-5 w-5 text-primary" />, text: "Em execução", tone: "text-primary" },
    queued: { icon: <AlertTriangle className="h-5 w-5 text-muted-foreground" />, text: "Na fila", tone: "text-muted-foreground" },
  };
  const s = statusStyles[status] ?? statusStyles.queued;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Nesta fase (RFC-001 Fase 5), apenas o dry-run é executado. A execução definitiva com escrita
        no Kanban será liberada em fases posteriores. O relatório abaixo pode ser baixado como JSON.
      </p>

      <div className="border rounded-md p-4 flex items-center gap-3">
        {s.icon}
        <div className="flex-1">
          <div className={`text-sm font-medium ${s.tone}`}>{s.text}</div>
          <div className="text-xs text-muted-foreground">Status atual do job: {status}</div>
        </div>
      </div>

      {report ? (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            adapter <code>{report.adapter_version}</code> · snapshot <code>{report.snapshot_version}</code> ·
            runner <code>{report.runner_version}</code> · hash <code>{report.file_hash.slice(0, 12)}…</code>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadReportJson(report, `import-${job?.id ?? "job"}.json`)}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Baixar relatório JSON
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          {isFinal ? "Nenhum relatório disponível." : "Aguardando conclusão…"}
        </div>
      )}
    </div>
  );
}
