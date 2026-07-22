import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyPanelProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyPanel({ icon: Icon, title, description, action, className }: EmptyPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10",
        className,
      )}
    >
      {Icon ? (
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <div className="ds-card-title">{title}</div>
      {description ? <p className="ds-caption text-muted-foreground max-w-sm">{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
