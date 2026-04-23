import { cn } from "@/lib/utils";
import { STATUS_LABEL, type PipelineStatus } from "@/lib/types";

const TONE: Record<PipelineStatus, string> = {
  novo: "bg-muted text-muted-foreground border-border",
  em_analise: "bg-info/15 text-info border-info/30",
  aprovado: "bg-secondary/20 text-secondary-foreground border-secondary/40",
  em_desenvolvimento: "bg-warning/15 text-warning border-warning/30",
  testando: "bg-info/15 text-info border-info/30",
  pronto: "bg-success/15 text-success border-success/30",
  em_producao: "bg-accent/20 text-accent border-accent/40",
};

export function StatusBadge({ status, className }: { status: PipelineStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
