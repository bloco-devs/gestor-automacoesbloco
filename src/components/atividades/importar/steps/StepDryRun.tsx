import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { RunReport, JobRow } from "@/lib/importador/types";
import { Button } from "@/components/ui/button";

interface Props {
  running: boolean;
  onRun: () => void;
  onCancel: () => void;
  job: JobRow | null;
  report: RunReport | null;
  error: string | null;
}

function CountsList({ counts, title }: { counts: RunReport["created"] | undefined; title: string }) {
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

export function StepDryRun({ running, onRun, onCancel, job, report, error }: Props) {
  const percent = job?.progress?.percent ?? 0;
  const phase = job?.progress?.phase ?? "—";
  const message = job?.progress?.message ?? "";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O dry-run executa toda a lógica de importação sem gravar dados reais. Use o relatório para
        conferir contagens, avisos e conflitos antes de qualquer execução definitiva.
      </p>

      {!report && !running && !error ? (
        <Button onClick={onRun}>Executar dry-run</Button>
      ) : null}

      {running ? (
        <div className="border rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            <span className="font-medium">Analisando...</span>
            <span className="text-muted-foreground">{phase}</span>
          </div>
          <div className="h-2 bg-muted rounded overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">{message}</div>
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        </div>
      ) : null}

      {error ? (
        <div className="border border-destructive/40 bg-destructive/5 rounded-md p-3 flex items-start gap-2">
          <XCircle className="size-4 text-destructive mt-0.5" />
          <div className="text-sm text-destructive">{error}</div>
        </div>
      ) : null}

      {report ? (() => {
        const warnings = report.warnings ?? [];
        const errors = report.errors ?? [];
        return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="font-medium">Dry-run concluído</span>
            <span className="text-muted-foreground">em {report.duration_ms ?? 0} ms</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-md p-4">
            <CountsList counts={report.created} title="Seriam criados" />
            <CountsList counts={report.reused} title="Reutilizados" />
          </div>

          {warnings.length > 0 ? (
            <div className="border rounded-md p-3 space-y-1">
              <div className="text-xs font-semibold uppercase text-amber-600 flex items-center gap-1">
                <AlertTriangle className="size-3.5" /> Avisos ({warnings.length})
              </div>
              <ul className="text-xs space-y-0.5 max-h-32 overflow-auto">
                {warnings.slice(0, 20).map((w, i) => (
                  <li key={i}><code className="text-[10px]">{w?.code}</code> {w?.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="border border-destructive/40 rounded-md p-3 space-y-1">
              <div className="text-xs font-semibold uppercase text-destructive flex items-center gap-1">
                <XCircle className="size-3.5" /> Erros ({errors.length})
              </div>
              <ul className="text-xs space-y-0.5 max-h-32 overflow-auto">
                {errors.slice(0, 20).map((e, i) => (
                  <li key={i}><code className="text-[10px]">{e?.code}</code> {e?.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button variant="outline" size="sm" onClick={onRun}>Refazer dry-run</Button>
        </div>
        );
      })() : null}
    </div>
  );
}
