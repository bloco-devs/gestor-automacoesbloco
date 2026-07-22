import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export type StatTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE: Record<StatTone, string> = {
  neutral: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

const TONE_BG: Record<StatTone, string> = {
  neutral: "bg-muted/40",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-destructive/10",
  info: "bg-info/10",
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: StatTone;
  className?: string;
}

/**
 * StatCard — padrão oficial de KPI/métrica (DS 2.0).
 * Substitui gradualmente MetricCard/HealthCard nas Ondas 4–5.
 */
export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-4 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="ds-label text-muted-foreground truncate">{label}</span>
        {Icon ? (
          <span className={cn("rounded-md p-1.5", TONE_BG[tone])}>
            <Icon className={cn("h-4 w-4", TONE[tone])} aria-hidden />
          </span>
        ) : null}
      </div>
      <div className={cn("ds-h2 tabular-nums", TONE[tone])}>{value}</div>
      {hint ? <div className="ds-caption text-muted-foreground">{hint}</div> : null}
    </Card>
  );
});
