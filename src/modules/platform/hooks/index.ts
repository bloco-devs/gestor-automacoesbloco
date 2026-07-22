import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlatformContext } from "../providers/PlatformProvider";
import { rank } from "../utils/ranking";
import type { PlatformCommand, NavItem, SearchEntity, RankedResult } from "../types";

export function usePlatform() {
  return usePlatformContext();
}

export function useCommandPalette() {
  const { paletteOpen, openPalette, closePalette, togglePalette } = usePlatformContext();
  return { open: paletteOpen, openPalette, closePalette, togglePalette };
}

export function useNavigation() {
  const { registries, navigate, role } = usePlatformContext();
  const items = useMemo(() => registries.navigation.listFor(role), [registries.navigation, role]);
  const goto = useCallback(
    (id: string) => {
      const route = registries.navigation.routeOf(id);
      if (route) navigate(route);
    },
    [navigate, registries.navigation],
  );
  return { items, goto, navigate, routeOf: (id: string) => registries.navigation.routeOf(id) };
}

export interface UseGlobalSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: RankedResult<SearchEntity>[];
  loading: boolean;
}

export function useGlobalSearch(debounceMs = 120): UseGlobalSearchResult {
  const { registries, recentIds } = usePlatformContext();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [entities, setEntities] = useState<SearchEntity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void registries.search.collect().then((list) => {
      if (!cancelled) {
        setEntities(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [registries.search]);

  const results = useMemo(() => {
    const rankable = entities.map((e) => ({
      id: `${e.type}:${e.id}`,
      title: e.label,
      description: e.description,
      keywords: e.keywords,
      category: e.type,
      _entity: e,
    }));
    const recentMapped = recentIds
      .filter((id) => id.startsWith("nav:") || id.startsWith("cmd:"))
      .map((id) => id.replace(/^nav:|^cmd:/, ""));
    const ranked = rank(rankable, debounced, { recentIds: recentMapped });
    return ranked.map((r) => ({
      item: r.item._entity as SearchEntity,
      score: r.score,
      reasons: r.reasons,
    }));
  }, [entities, debounced, recentIds]);

  return { query, setQuery, results, loading };
}

export function useCommands(): { commands: PlatformCommand[]; run: (id: string) => void } {
  const { registries, role, runCommand } = usePlatformContext();
  const commands = useMemo(() => registries.commands.listFor(role), [registries.commands, role]);
  return { commands, run: runCommand };
}

export type { NavItem, PlatformCommand, SearchEntity };
export { useHotkeys } from "../hotkeys/useHotkeys";
export { useDemandQuickActions } from "./useDemandQuickActions";
export { useGlobalFavorites } from "../favorites/useGlobalFavorites";
export type { FavoriteItem, FavoriteKind } from "../favorites/useGlobalFavorites";
