import { CheckCircle2, Download, AlertTriangle, XCircle, Loader2, PlayCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { JobRow, RunReport } from "@/lib/importador/types";
import { Button } from "@/components/ui/button";
import { downloadReportJson } from "@/lib/importador/api";

interface Props {
  job: JobRow | null;
  report: RunReport | null;
  // Fase 6 — execução definitiva
  dryReport?: RunReport | null;
  realReport?: RunReport | null;
  realJob?: JobRow | null;
  realRunning?: boolean;
  realError?: string | null;
  realBoardId?: string | null;
  onExecuteReal?: () => void;
  onCancelReal?: () => void;
}

function CountsBox({ counts, title }: { counts: RunReport["created"] | undefined; title: string }) {
  const entries = Object.entries(counts ?? {}).filter(([, v]) => (v ?? 0) > 0);

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{title}</h4>
      {entries.length === 0 ? (
        <div className="text-xs text-muted-foreground">—</div>
      ) : (
        <ul className="text-sm space-y-0.5">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between">
              <span className="capitalize">{k}</span>
              <span className="font-medium">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StepExecucao({
  job, report,
  dryReport, realReport, realJob, realRunning, realError, realBoardId,
  onExecuteReal, onCancelReal,
}: Props) {
  const status = job?.status ?? "queued";

  const statusStyles: Record<string, { icon: JSX.Element; text: string; tone: string }> = {
    success: { icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, text: "Concluído com sucesso", tone: "text-emerald-700" },
    partial: { icon: <AlertTriangle className="h-5 w-5 text-amber-600" />, text: "Concluído com avisos", tone: "text-amber-700" },
    failed: { icon: <XCircle className="h-5 w-5 text-destructive" />, text: "Falhou", tone: "text-destructive" },
    cancelled: { icon: <XCircle className="h-5 w-5 text-muted-foreground" />, text: "Cancelado", tone: "text-muted-foreground" },
    running: { icon: <Loader2 className="h-5 w-5 text-primary animate-spin" />, text: "Em execução", tone: "text-primary" },
    queued: { icon: <AlertTriangle className="h-5 w-5 text-muted-foreground" />, text: "Na fila", tone: "text-muted-foreground" },
  };
  const s = statusStyles[status] ?? statusStyles.queued;

  const percent = realJob?.progress?.percent ?? 0;
  const phase = realJob?.progress?.phase ?? "—";
  const message = realJob?.progress?.message ?? "";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Etapa final: revise o dry-run e, se estiver tudo certo, execute a importação
        definitiva. A execução usa as mesmas RPCs do módulo Atividades (RLS aplicado).
      </p>

      <div className="border rounded-md p-4 flex items-center gap-3">
        {s.icon}
        <div className="flex-1">
          <div className={`text-sm font-medium ${s.tone}`}>{s.text}</div>
          <div className="text-xs text-muted-foreground">
            Status atual: {status}{realReport ? " · execução definitiva" : dryReport ? " · dry-run" : ""}
          </div>
        </div>
      </div>

      {report ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-md p-4">
          <CountsBox counts={report.created} title={realReport ? "Criados" : "Seriam criados"} />
          <CountsBox counts={report.reused} title="Reutilizados" />
        </div>
      ) : null}

      {report ? (
        <div className="text-xs text-muted-foreground">
          adapter <code>{report.adapter_version}</code> · snapshot <code>{report.snapshot_version}</code> ·
          runner <code>{report.runner_version}</code> · hash <code>{report.file_hash.slice(0, 12)}…</code>
        </div>
      ) : null}

      {/* Ações de execução real */}
      {!realReport && !realRunning && !realError && dryReport ? (
        <div className="border rounded-md p-4 space-y-2 bg-muted/30">
          <div className="text-sm font-medium">Pronto para gravar no Kanban</div>
          <p className="text-xs text-muted-foreground">
            Ao confirmar, o importador irá <strong>gravar de verdade</strong> as colunas, etiquetas,
            cards, checklists e comentários no quadro alvo. A operação é idempotente: cada entidade
            externa é registrada em <code>atividades_import_entities</code> para evitar duplicação.
          </p>
          <Button onClick={onExecuteReal}>
            <PlayCircle className="h-4 w-4 mr-1.5" /> Executar importação definitiva
          </Button>
        </div>
      ) : null}

      {realRunning ? (
        <div className="border rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">Importando…</span>
            <span className="text-muted-foreground">{phase}</span>
          </div>
          <div className="h-2 bg-muted rounded overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">{message}</div>
          <Button variant="outline" size="sm" onClick={onCancelReal}>Cancelar</Button>
        </div>
      ) : null}

      {realError ? (
        <div className="border border-destructive/40 bg-destructive/5 rounded-md p-3 flex items-start gap-2">
          <XCircle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="text-sm text-destructive">{realError}</div>
        </div>
      ) : null}

      {realReport ? (
        <div className="space-y-3">
          {realReport.warnings.length > 0 ? (
            <div className="border rounded-md p-3 space-y-1">
              <div className="text-xs font-semibold uppercase text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Avisos ({realReport.warnings.length})
              </div>
              <ul className="text-xs space-y-0.5 max-h-32 overflow-auto">
                {realReport.warnings.slice(0, 20).map((w, i) => (
                  <li key={i}><code className="text-[10px]">{w.code}</code> {w.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {realReport.errors.length > 0 ? (
            <div className="border border-destructive/40 rounded-md p-3 space-y-1">
              <div className="text-xs font-semibold uppercase text-destructive flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> Erros ({realReport.errors.length})
              </div>
              <ul className="text-xs space-y-0.5 max-h-32 overflow-auto">
                {realReport.errors.slice(0, 20).map((e, i) => (
                  <li key={i}><code className="text-[10px]">{e.code}</code> {e.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {realBoardId ? (
            <Button asChild size="sm">
              <Link to={`/atividades/${realBoardId}`}>
                <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir quadro importado
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {report ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadReportJson(realReport ?? report!, `import-${(realJob?.id ?? job?.id) ?? "job"}.json`)}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Baixar relatório JSON
        </Button>
      ) : (
        <div className="text-xs text-muted-foreground">Aguardando conclusão…</div>
      )}
    </div>
  );
}
