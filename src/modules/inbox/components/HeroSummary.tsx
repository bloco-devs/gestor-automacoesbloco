import { memo } from "react";
import { AlertTriangle, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { greeting } from "../utils/format";
import type { InboxSummaryCounts } from "../types";

interface Props {
  name: string;
  counts: InboxSummaryCounts;
}

const chips: Array<{
  key: keyof Omit<InboxSummaryCounts, "total">;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { key: "critical", label: "Críticos", icon: AlertTriangle, tone: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { key: "inProgress", label: "Em andamento", icon: Loader2, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { key: "waitingQa", label: "Aguardando QA", icon: ShieldCheck, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { key: "doneToday", label: "Concluídos hoje", icon: CheckCircle2, tone: "bg-muted text-muted-foreground" },
];

function HeroSummary({ name, counts }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {name} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">Seu trabalho de hoje, em ordem de prioridade.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chips.map((c) => {
          const value = counts[c.key];
          const Icon = c.icon;
          return (
            <Card
              key={c.key}
              className={cn("p-3 flex items-center gap-3 border-border/60")}
              aria-label={`${c.label}: ${value}`}
            >
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", c.tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">{c.label}</div>
                <div className="text-lg font-semibold tabular-nums">{value}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default memo(HeroSummary);
