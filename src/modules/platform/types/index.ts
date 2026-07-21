import type { ComponentType } from "react";
import type { Role } from "@/lib/types";

export type PlatformRole = Role | "administrador";

export type IconLike = ComponentType<{ className?: string }>;

/** ---------- Navigation ---------- */
export type NavCategory =
  | "Trabalho"
  | "Solicitações"
  | "Soluções"
  | "Atividades"
  | "IA"
  | "Configuração"
  | "Ajuda"
  | "Sistema";

export interface NavAction {
  id: string;
  title: string;
  route?: string;
  handler?: (nav: (route: string) => void) => void;
}

export interface NavItem {
  id: string;
  title: string;
  description?: string;
  route: string;
  category: NavCategory;
  keywords?: string[];
  icon?: IconLike;
  /** Roles com acesso; se ausente, disponível para todos os autenticados. */
  permissions?: PlatformRole[];
  actions?: NavAction[];
}

/** ---------- Search ---------- */
export type SearchEntityType =
  | "solicitacao"
  | "solucao"
  | "atividade"
  | "usuario"
  | "sprint"
  | "projeto"
  | "artigo"
  | "automacao"
  | "nav";

export interface SearchEntity {
  id: string;
  type: SearchEntityType;
  label: string;
  description?: string;
  keywords?: string[];
  route?: string;
  icon?: IconLike;
  /** Opcional: navegação custom quando `route` não é suficiente. */
  navigate?: (nav: (route: string) => void) => void;
  /** Metadata livre para renderização/telemetria. */
  meta?: Record<string, unknown>;
}

/** ---------- Commands ---------- */
export type CommandCategory =
  | "Navegar"
  | "Criar"
  | "Trabalho"
  | "IA"
  | "Configuração"
  | "Sistema";

export interface PlatformCommand {
  id: string;
  title: string;
  description?: string;
  /** Ex.: "mod+k", "mod+shift+n". Só o handler global executa. */
  shortcut?: string;
  category: CommandCategory;
  icon?: IconLike;
  permissions?: PlatformRole[];
  handler: (ctx: CommandContext) => void | Promise<void>;
  keywords?: string[];
}

export interface CommandContext {
  navigate: (route: string) => void;
  closePalette: () => void;
  openPalette: () => void;
}

/** ---------- Ranking ---------- */
export interface RankedResult<T> {
  item: T;
  score: number;
  reasons: string[];
}
