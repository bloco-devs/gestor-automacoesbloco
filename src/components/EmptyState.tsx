import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * DS 3.0 — EmptyState
 *
 * Deixou de ser um Card com um círculo cinza grande dentro. Um estado vazio
 * é ausência de conteúdo: o que resolve é espaço, uma frase curta e uma ação
 * clara — não mais uma caixa. Mesmo contrato de props de antes.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-14 text-center", className)}>
      {Icon ? <Icon className="size-5 text-muted-foreground/60" aria-hidden /> : null}
      <div className="max-w-md space-y-1">
        <h3 className="ds-body-strong text-foreground">{title}</h3>
        {description ? <p className="ds-caption text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
