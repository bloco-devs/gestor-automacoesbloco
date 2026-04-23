import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/score";

export function ScorePill({ score, className }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums border",
        tone === "high" && "bg-accent text-accent-foreground border-accent",
        tone === "mid" && "bg-secondary/20 text-secondary-foreground border-secondary/40",
        tone === "low" && "bg-muted text-muted-foreground border-border",
        className,
      )}
      title="Score de priorização (0-100)"
    >
      {score}
    </span>
  );
}
