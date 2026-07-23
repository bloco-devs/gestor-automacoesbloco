/**
 * UnifiedSidebar — sidebar única compartilhada por todos os shells.
 * Renderiza a partir do UnifiedNavigationRegistry. Nenhum item hardcoded.
 * Persiste em localStorage: estado recolhido, grupo expandido, último item.
 */
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavigation } from "./registry";
import type { NavigationItem, NavigationProfile } from "./types";

const STORAGE = {
  collapsed: "ds2:unified-sidebar:collapsed",
  group: (profile: string, groupId: string) => `ds2:unified-sidebar:${profile}:group:${groupId}`,
  last: (profile: string) => `ds2:unified-sidebar:${profile}:last`,
} as const;

interface Props {
  profile: NavigationProfile;
  className?: string;
}

function UnifiedSidebarImpl({ profile, className }: Props) {
  const schema = useMemo(() => getNavigation(profile), [profile]);
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE.collapsed) === "1";
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE.collapsed, next ? "1" : "0");
      }
      return next;
    });
  }, []);

  // Salva último item visitado
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE.last(profile), pathname);
  }, [profile, pathname]);

  return (
    <aside
      aria-label={`Navegação — ${profile}`}
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-14" : "w-64",
        className,
      )}
    >
      <div className="flex items-center justify-between h-12 px-3 border-b border-sidebar-border/60">
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {profileLabel(profile)}
          </span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent/60 text-muted-foreground"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {schema.groups.map((group) => (
          <GroupBlock key={group.id} profile={profile} group={group} collapsed={collapsed} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

export const UnifiedSidebar = memo(UnifiedSidebarImpl);

/* ------------------------------------------------------------------ */

function profileLabel(profile: NavigationProfile): string {
  switch (profile) {
    case "portal":
      return "Portal";
    case "workspace":
      return "Workspace";
    case "gestao":
      return "Gestão";
    case "admin":
      return "Admin";
  }
}

function GroupBlock({
  profile,
  group,
  collapsed,
  pathname,
}: {
  profile: NavigationProfile;
  group: { id: string; label: string; items: NavigationItem[] };
  collapsed: boolean;
  pathname: string;
}) {
  const storageKey = STORAGE.group(profile, group.id);
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(storageKey);
    return v === null ? true : v === "1";
  });

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (typeof window !== "undefined") window.localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  }, [storageKey]);

  return (
    <div className="px-2">
      {!collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="w-full flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground"
        >
          <span className="flex-1 text-left truncate">{group.label}</span>
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
      )}
      {(open || collapsed) && (
        <div className="mt-1 space-y-0.5">
          {group.items.map((item) => (
            <SidebarLink key={item.id} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  item,
  collapsed,
  pathname,
}: {
  item: NavigationItem;
  collapsed: boolean;
  pathname: string;
}) {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const isActive = pathname === item.route || pathname.startsWith(item.route + "/");
  const [open, setOpen] = useState<boolean>(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  if (item.hidden) return null;

  if (!hasChildren) {
    return (
      <NavLink
        to={item.route}
        end
        title={collapsed ? item.label : undefined}
        className={({ isActive: active }) =>
          cn(
            "flex items-center gap-3 px-2 py-2 rounded-md text-sm min-w-0 transition-colors",
            active
              ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60",
          )
        }
      >
        {Icon && <Icon className="size-4 shrink-0" />}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? item.label : undefined}
        className={cn(
          "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm min-w-0 transition-colors",
          isActive ? "bg-sidebar-accent/40 text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
        )}
      >
        {Icon && <Icon className="size-4 shrink-0" />}
        {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
        {!collapsed && (
          <ChevronDown className={cn("size-3.5 transition-transform text-muted-foreground", open && "rotate-180")} />
        )}
      </button>
      {open && !collapsed && item.children && (
        <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border/60 space-y-0.5">
          {item.children.map((child) => (
            <SidebarLink key={child.id} item={child} collapsed={false} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}
