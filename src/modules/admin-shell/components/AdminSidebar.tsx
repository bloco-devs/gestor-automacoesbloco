import { memo } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ADMIN_GROUPS, ADMIN_NAV } from "../navigation/registry";
import type { AdminNavItem } from "../types";

interface Props {
  activeHref?: string | null;
  onNavigate?: (item: AdminNavItem) => void;
}

function AdminSidebarImpl({ activeHref, onNavigate }: Props) {
  return (
    <nav aria-label="Administração" className="flex flex-col gap-6 text-sm">
      {ADMIN_GROUPS.map((group) => {
        const items = ADMIN_NAV.filter((it) => it.group === group.id);
        if (!items.length) return null;
        return (
          <div key={group.id}>
            <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = activeHref === item.href;
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.href}
                      onClick={() => onNavigate?.(item)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs outline-none transition-all duration-150",
                        "hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-ring",
                        active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-xs border-l-2 border-primary",
                      )}
                    >
                      <Icon strokeWidth={1.8} className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.status && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {item.status}
                        </Badge>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export const AdminSidebar = memo(AdminSidebarImpl);
