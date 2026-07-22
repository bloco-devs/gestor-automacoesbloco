import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { navigationRegistry } from "../registry/navigation-registry";
import { commandRegistry } from "../registry/command-registry";
import { searchRegistry } from "../registry/search-registry";
import { DEFAULT_COMMANDS, DEFAULT_NAV_ITEMS } from "../registry/defaults";
import { useHotkeys } from "../hotkeys/useHotkeys";
import type { PlatformCommand, PlatformRole } from "../types";
import { CommandPalette } from "../components/CommandPalette";
import { ShortcutsDialog } from "../components/ShortcutsDialog";
import { SpotlightProviders } from "../spotlight/SpotlightProviders";

const RECENT_KEY = "platform:recent";
const MAX_RECENT = 12;

function loadRecent(): string[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(RECENT_KEY) : null;
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function persistRecent(ids: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

interface PlatformContextValue {
  role: PlatformRole | null;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  navigate: (route: string) => void;
  runCommand: (id: string) => void;
  recentIds: string[];
  markRecent: (id: string) => void;
  registries: {
    navigation: typeof navigationRegistry;
    commands: typeof commandRegistry;
    search: typeof searchRegistry;
  };
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

// Registra defaults uma única vez (idempotente por ID)
let defaultsRegistered = false;
function ensureDefaults(): void {
  if (defaultsRegistered) return;
  navigationRegistry.registerMany(DEFAULT_NAV_ITEMS);
  commandRegistry.registerMany(DEFAULT_COMMANDS);
  defaultsRegistered = true;
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  ensureDefaults();
  const nav = useNavigate();
  const { user } = useAuth();
  const role: PlatformRole | null = user?.isAdministrador
    ? "administrador"
    : (user?.role as PlatformRole | undefined) ?? null;

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecent());
  const recentRef = useRef(recentIds);
  recentRef.current = recentIds;

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), []);

  const navigate = useCallback(
    (route: string) => {
      nav(route);
    },
    [nav],
  );

  const markRecent = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      persistRecent(next);
      return next;
    });
  }, []);

  const runCommand = useCallback(
    (id: string) => {
      const cmd = commandRegistry.get(id);
      if (!cmd) return;
      markRecent(`cmd:${id}`);
      void cmd.handler({ navigate, closePalette, openPalette });
    },
    [navigate, closePalette, openPalette, markRecent],
  );

  // Hotkeys globais: mod+k abre palette; comandos com shortcut também respondem.
  const bindings = useMemo(() => {
    const base = [
      {
        combo: "mod+k",
        handler: () => togglePalette(),
      },
    ];
    const cmds = commandRegistry
      .listFor(role)
      .filter((c) => !!c.shortcut)
      .map((c: PlatformCommand) => ({
        combo: c.shortcut!,
        handler: () => runCommand(c.id),
      }));
    return [...base, ...cmds];
  }, [role, runCommand, togglePalette]);

  useHotkeys(bindings);

  // Injeta nav items como entidades pesquisáveis (uma vez)
  useEffect(() => {
    for (const item of navigationRegistry.list()) {
      searchRegistry.register({
        id: item.id,
        type: "nav",
        label: item.title,
        description: item.description,
        keywords: item.keywords,
        route: item.route,
        icon: item.icon,
      });
    }
  }, []);

  const value = useMemo<PlatformContextValue>(
    () => ({
      role,
      paletteOpen,
      openPalette,
      closePalette,
      togglePalette,
      navigate,
      runCommand,
      recentIds,
      markRecent,
      registries: {
        navigation: navigationRegistry,
        commands: commandRegistry,
        search: searchRegistry,
      },
    }),
    [role, paletteOpen, openPalette, closePalette, togglePalette, navigate, runCommand, recentIds, markRecent],
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
      <CommandPalette />
    </PlatformContext.Provider>
  );
}

export function usePlatformContext(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatformContext deve ser usado dentro de <PlatformProvider>");
  return ctx;
}
