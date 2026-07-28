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
                        "flex items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors",
                        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                        active && "bg-muted font-medium text-foreground",
                      )}
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      <span className="truncate">{item.label}</span>
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
