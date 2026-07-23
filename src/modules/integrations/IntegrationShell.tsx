import { memo, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Plug } from "lucide-react";
import { PageShell } from "@/design-system/layout/PageShell";
import { PageHeader } from "@/design-system/layout/PageHeader";
import { cn } from "@/lib/utils";
import { INTEGRATION_ROUTES } from "@/modules/integrations/routes";

export interface IntegrationShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shell compartilhado do Integration Hub — DS 2.0.
 */
export const IntegrationShell = memo(function IntegrationShell({
  title,
  description,
  actions,
  children,
}: IntegrationShellProps) {
  const { pathname } = useLocation();
  return (
    <PageShell maxWidth="full">
      <PageHeader
        title={title}
        subtitle={description}
        icon={<Plug className="h-6 w-6" />}
        actions={actions}
      />
      <nav aria-label="Integration Hub" className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
        {INTEGRATION_ROUTES.map((r) => {
          const active = pathname === r.to;
          return (
            <NavLink
              key={r.to}
              to={r.to}
              end={r.to === "/admin/integrations"}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title={r.description}
            >
              {r.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="space-y-6">{children}</div>
    </PageShell>
  );
});
