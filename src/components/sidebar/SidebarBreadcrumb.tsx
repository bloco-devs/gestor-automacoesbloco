import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { findActive, type NavGroup } from "./navGroups";

interface Props {
  groups: NavGroup[];
}

/**
 * Breadcrumb automático baseado nos grupos de navegação.
 * Ex.: "Trabalho › Solicitações › Kanban".
 */
export function SidebarBreadcrumb({ groups }: Props) {
  const { pathname } = useLocation();
  const active = useMemo(() => findActive(groups, pathname), [groups, pathname]);

  if (!active) return null;
  const { group, item, child } = active;
  const itemHref = item.to ?? item.children?.[0]?.to;

  return (
    <nav aria-label="Trilha de navegação" className="flex items-center gap-1 min-w-0 truncate">
      <span className="text-muted-foreground/70">{group.label}</span>
      <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
      {itemHref ? (
        <Link
          to={itemHref}
          className="text-muted-foreground hover:text-foreground transition-colors truncate"
        >
          {item.label}
        </Link>
      ) : (
        <span className="text-muted-foreground truncate">{item.label}</span>
      )}
      {child && (
        <>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
          <span className="text-foreground font-medium truncate" aria-current="page">
            {child.label}
          </span>
        </>
      )}
    </nav>
  );
}
