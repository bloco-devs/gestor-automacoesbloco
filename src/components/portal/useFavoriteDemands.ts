import { useEffect, useState } from "react";

const KEY = "portal:favorites:v1";

export function useFavoriteDemands() {
  const [ids, setIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* silencioso */
    }
  }, [ids]);

  return {
    isFavorite: (id: string) => ids.includes(id),
    toggle: (id: string) =>
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    favorites: ids,
  };
}
