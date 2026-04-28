import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_ORDER, STATUS_LABEL, statusToCategory, type PipelineStatus } from "@/lib/types";

const COMPACT_STATUS_LABEL: Record<PipelineStatus, string> = {
  novo: "Novo",
  em_analise: "Análise",
  aprovado: "Aprov.",
  em_desenvolvimento: "Desenv.",
  testando: "Teste",
  pronto: "Pronto",
  em_producao: "Prod.",
};

export function StatusTimeline({ current, compact = false }: { current: PipelineStatus; compact?: boolean }) {
  const currentCategory = statusToCategory(current);
  const currentIdx = PIPELINE_ORDER.indexOf(currentCategory);
  return (
    <ol className={cn("flex items-center", compact ? "w-full flex-nowrap gap-1 overflow-hidden" : "flex-wrap gap-2")}>
      {PIPELINE_ORDER.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s} className={cn("flex items-center", compact ? "min-w-0 flex-1 gap-1" : "shrink-0 gap-2")}>
            <div
              className={cn(
                "flex min-w-0 items-center rounded-full border text-xs transition-colors whitespace-nowrap",
                compact ? "gap-1 px-1.5 py-0.5 text-[10px] sm:gap-1.5 sm:px-2 sm:text-xs" : "gap-2 px-3 py-1",
                done && "bg-success/10 border-success/30 text-success",
                active && "bg-accent text-accent-foreground border-accent glow-accent font-medium",
                !done && !active && "bg-muted border-border text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="size-3" />
              ) : (
                <span className={cn("size-1.5 rounded-full", active ? "bg-accent-foreground" : "bg-muted-foreground/60")} />
              )}
              {compact ? (
                <>
                  <span className="hidden sm:inline truncate">{STATUS_LABEL[s]}</span>
                  <span className="sm:hidden truncate">{COMPACT_STATUS_LABEL[s]}</span>
                </>
              ) : (
                STATUS_LABEL[s]
              )}
            </div>
            {i < PIPELINE_ORDER.length - 1 && <div className={cn("h-px shrink-0 bg-border", compact ? "w-1 sm:w-2" : "w-3")} />}
          </li>
        );
      })}
    </ol>
  );
}
