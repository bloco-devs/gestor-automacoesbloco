import { useCallback, useSyncExternalStore } from "react";

const KEY = "platform:favorites:v1";

export type FavoriteKind =
  | "demand"
  | "article"
  | "workflow"
  | "user"
  | "system"
  | "dashboard"
  | "nav";

export interface FavoriteItem {
  id: string;
  kind: FavoriteKind;
  label: string;
  route?: string;
  description?: string;
}

const listeners = new Set<() => void>();

function read(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

let cache: FavoriteItem[] = read();

function persist(next: FavoriteItem[]) {
  cache = next.slice(0, 50);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function getSnapshot() {
  return cache;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = read();
      listeners.forEach((l) => l());
    }
  });
}

export function useGlobalFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toggle = useCallback((item: FavoriteItem) => {
    const exists = cache.some((f) => f.kind === item.kind && f.id === item.id);
    persist(
      exists
        ? cache.filter((f) => !(f.kind === item.kind && f.id === item.id))
        : [item, ...cache],
    );
  }, []);

  const remove = useCallback((kind: FavoriteKind, id: string) => {
    persist(cache.filter((f) => !(f.kind === kind && f.id === id)));
  }, []);

  const isFavorite = useCallback(
    (kind: FavoriteKind, id: string) =>
      favorites.some((f) => f.kind === kind && f.id === id),
    [favorites],
  );

  return { favorites, toggle, remove, isFavorite };
}

export function getFavoritesSnapshot(): FavoriteItem[] {
  return cache;
}
