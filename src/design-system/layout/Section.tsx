import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/**
 * DS 3.0 — Section
 *
 * O bloco vertical é a alternativa ao card: agrupa por espaço e por título,
 * não por caixa. O título usa ds-h3 para não competir com o ds-h1 da página.
 */
export function Section({ title, description, actions, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title ? <h2 className="ds-h3">{title}</h2> : null}
            {description ? <p className="ds-caption mt-0.5 text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
