import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_ORDER, STATUS_LABEL, statusToCategory, type PipelineStatus } from "@/lib/types";

export function StatusTimeline({ current, compact = false }: { current: PipelineStatus; compact?: boolean }) {
  const currentCategory = statusToCategory(current);
  const currentIdx = PIPELINE_ORDER.indexOf(currentCategory);
  return (
    <ol className={cn("flex items-center", compact ? "flex-nowrap gap-1 overflow-x-auto pb-1" : "flex-wrap gap-2")}>
      {PIPELINE_ORDER.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s} className={cn("flex shrink-0 items-center", compact ? "gap-1" : "gap-2")}>
            <div
              className={cn(
                "flex items-center rounded-full border text-xs transition-colors whitespace-nowrap",
                compact ? "gap-1.5 px-2 py-0.5" : "gap-2 px-3 py-1",
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
              {STATUS_LABEL[s]}
            </div>
            {i < PIPELINE_ORDER.length - 1 && <div className={cn("h-px bg-border", compact ? "w-2" : "w-3")} />}
          </li>
        );
      })}
    </ol>
  );
}
