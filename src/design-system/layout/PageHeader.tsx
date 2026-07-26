import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}

/**
 * DS 3.0 — PageHeader
 *
 * Cabeçalho fino e calmo: breadcrumb discreto, título em ds-h1 (agora menor),
 * subtítulo em texto secundário. O ícone perdeu a cor primária — cor de marca
 * em elemento decorativo é exatamente o que fazia a página parecer painel
 * administrativo. Agora ele é neutro e opcional.
 */
export function PageHeader({ title, subtitle, icon, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-1.5", className)}>
      {breadcrumb ? <div className="ds-caption text-muted-foreground">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div> : null}
          <div className="min-w-0">
            <h1 className="ds-h1 truncate">{title}</h1>
            {subtitle ? <p className="ds-caption mt-1 max-w-2xl text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
