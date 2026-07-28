import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ADMIN_GROUPS } from "../navigation/registry";
import type { AdminNavItem } from "../types";

interface Props {
  active: AdminNavItem | null;
}

export function AdminBreadcrumb({ active }: Props) {
  const group = active ? ADMIN_GROUPS.find((g) => g.id === active.group) : null;
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      <Link to="/admin" className="hover:text-foreground">
        Administração
      </Link>
      {group && (
        <>
          <ChevronRight className="size-3" aria-hidden />
          <span>{group.label}</span>
        </>
      )}
      {active && (
        <>
          <ChevronRight className="size-3" aria-hidden />
          <span className="text-foreground">{active.label}</span>
        </>
      )}
    </nav>
  );
}
