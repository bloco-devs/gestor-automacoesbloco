import { memo, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Code2 } from "lucide-react";
import { PageShell } from "@/design-system/layout/PageShell";
import { PageHeader } from "@/design-system/layout/PageHeader";
import { cn } from "@/lib/utils";
import { DEVELOPER_ROUTES } from "./routes";

export interface DeveloperShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shell compartilhado do Developer Center — DS 2.0.
 * Sub-navegação persistente entre painéis; conteúdo lazy-owned pela página.
 */
export const DeveloperShell = memo(function DeveloperShell({
  title,
  description,
  actions,
  children,
}: DeveloperShellProps) {
  const { pathname } = useLocation();
  return (
    <PageShell maxWidth="full">
      <PageHeader
        title={title}
        description={description}
        icon={Code2}
        actions={actions}
      />
      <nav
        aria-label="Developer Center"
        className="flex flex-wrap gap-1 rounded-lg border bg-card p-1"
      >
        {DEVELOPER_ROUTES.map((r) => {
          const active = pathname === r.to;
          return (
            <NavLink
              key={r.to}
              to={r.to}
              end={r.to === "/developer"}
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
