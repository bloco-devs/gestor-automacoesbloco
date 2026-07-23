import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Home, ListTodo, BookOpen, Inbox } from "lucide-react";

const TABS = [
  { to: "/portal/inicio", label: "Início", icon: Home, end: true },
  { to: "/portal/demandas", label: "Minhas Demandas", icon: ListTodo },
  { to: "/portal/conhecimento", label: "Conhecimento", icon: BookOpen },
  { to: "/portal/inbox", label: "Inbox", icon: Inbox },
];

/**
 * Shell único do Portal Unificado (FEATURE 026.2).
 * Renderiza somente sob a flag `ux.rewrite`.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <nav
        aria-label="Portal"
        className="-mx-1 flex items-center gap-1 overflow-x-auto border-b border-border pb-2"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon className="size-4" aria-hidden />
              {t.label}
            </NavLink>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
