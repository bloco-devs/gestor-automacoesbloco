import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { ADMIN_NAV } from "../navigation/registry";
import type { AdminNavItem } from "../types";

/** Retorna o item ativo (match exato ou por prefixo). */
export function useAdminRoute(): AdminNavItem | null {
  const { pathname } = useLocation();
  return useMemo(() => {
    const exact = ADMIN_NAV.find((it) => it.href === pathname);
    if (exact) return exact;
    return (
      ADMIN_NAV.filter((it) => pathname.startsWith(it.href) && it.href !== "/")
        .sort((a, b) => b.href.length - a.href.length)[0] ?? null
    );
  }, [pathname]);
}
