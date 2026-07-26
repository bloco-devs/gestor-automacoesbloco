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

/**
 * DS 3.0 — EmptyPanel
 *
 * Sem borda tracejada e sem fundo cinza: um estado vazio não precisa de uma
 * caixa avisando que está vazio. Muito espaço, ícone pequeno e discreto,
 * texto curto e uma única ação evidente.
 */
export function EmptyPanel({ icon: Icon, title, description, action, className }: EmptyPanelProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-14 text-center", className)}>
      {Icon ? <Icon className="h-5 w-5 text-muted-foreground/60" aria-hidden /> : null}
      <div className="ds-body-strong">{title}</div>
      {description ? <p className="ds-caption max-w-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
