import { cn } from "@/lib/utils";
import { STATUS_LABEL, statusToCategory, type PipelineStatus } from "@/lib/types";

// DS 3.0 — tinta sutil, sem borda: mesma linguagem do Badge. O status continua
// legível pela cor, mas para de disputar atenção com o titulo da demanda.
const TONE: Record<PipelineStatus, string> = {
  novo: "bg-muted text-muted-foreground",
  em_analise: "bg-info/12 text-info",
  aprovado: "bg-secondary/15 text-secondary",
  em_desenvolvimento: "bg-warning/15 text-warning",
  testando: "bg-info/12 text-info",
  pronto: "bg-success/12 text-success",
  em_producao: "bg-primary/15 text-foreground",
};

export function StatusBadge({ status, className }: { status: PipelineStatus; className?: string }) {
  const displayStatus = statusToCategory(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[displayStatus],
        className,
      )}
    >
      {STATUS_LABEL[displayStatus]}
    </span>
  );
}
