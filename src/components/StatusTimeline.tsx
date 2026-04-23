import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_ORDER, STATUS_LABEL, type PipelineStatus } from "@/lib/types";

export function StatusTimeline({ current }: { current: PipelineStatus }) {
  const currentIdx = PIPELINE_ORDER.indexOf(current);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {PIPELINE_ORDER.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
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
            {i < PIPELINE_ORDER.length - 1 && <div className="h-px w-3 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
