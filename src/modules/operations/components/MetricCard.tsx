import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  compact?: boolean;
}

const TONE: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

export function MetricCard({ label, value, hint, icon: Icon, tone = "default", compact }: MetricCardProps) {
  return (
    <Card className="h-full">
      <CardContent className={cn("flex flex-col gap-1", compact ? "p-3" : "p-4")}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          {Icon ? <Icon className={cn("size-4", TONE[tone])} aria-hidden /> : null}
        </div>
        <span className={cn("font-semibold", compact ? "text-xl" : "text-2xl", TONE[tone])}>{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}
