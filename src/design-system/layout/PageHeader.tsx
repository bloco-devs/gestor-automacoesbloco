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
 * PageHeader — cabeçalho oficial de página.
 * Segue tipografia DS 2.0 (ds-h1 / ds-body caption).
 */
export function PageHeader({ title, subtitle, icon, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      {breadcrumb ? <div className="ds-caption text-muted-foreground">{breadcrumb}</div> : null}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {icon ? <div className="mt-1 shrink-0 text-primary">{icon}</div> : null}
          <div className="min-w-0">
            <h1 className="ds-h1 truncate">{title}</h1>
            {subtitle ? <p className="ds-caption text-muted-foreground mt-1">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
