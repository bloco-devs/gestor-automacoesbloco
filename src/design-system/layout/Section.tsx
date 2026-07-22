import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/**
 * Section — bloco vertical padronizado dentro de uma página.
 */
export function Section({ title, description, actions, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            {title ? <h2 className="ds-h2">{title}</h2> : null}
            {description ? <p className="ds-caption text-muted-foreground mt-1">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
