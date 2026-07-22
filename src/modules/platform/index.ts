export { PlatformProvider, usePlatformContext } from "./providers/PlatformProvider";
export {
  usePlatform,
  useCommandPalette,
  useNavigation,
  useGlobalSearch,
  useCommands,
  useHotkeys,
  useDemandQuickActions,
  useGlobalFavorites,
} from "./hooks";
export type { FavoriteItem, FavoreKind } from "./hooks";
export { navigationRegistry } from "./registry/navigation-registry";
export { commandRegistry } from "./registry/command-registry";
export { searchRegistry } from "./registry/search-registry";
export { rank } from "./utils/ranking";
export { parseHotkey, matchesEvent, formatHotkey } from "./utils/hotkeys";
export { CommandPalette } from "./components/CommandPalette";
export type {
  NavItem,
  NavCategory,
  PlatformCommand,
  CommandCategory,
  CommandContext,
  SearchEntity,
  SearchEntityType,
  RankedResult,
  PlatformRole,
} from "./types";
