import type { AdminNavItem } from "../types";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Busca administrativa puramente client-side sobre o registry estático.
 * Não usa banco nem edge function.
 */
export function searchAdminNav(items: AdminNavItem[], query: string): AdminNavItem[] {
  const q = normalize(query.trim());
  if (!q) return items;
  return items.filter((item) => {
    const haystack = [
      item.label,
      item.description,
      item.href,
      item.details ?? "",
      ...(item.keywords ?? []),
      ...(item.related?.map((r) => r.label) ?? []),
    ]
      .map(normalize)
      .join(" \u0000 ");
    return haystack.includes(q);
  });
}
