/**
 * FEATURE 026.1 — Unified Navigation Registry types.
 * Aditivo. Nenhum comportamento em runtime até `ux.rewrite` ser ativada.
 */
import type { LucideIcon } from "lucide-react";

export type NavigationProfile = "portal" | "workspace" | "gestao" | "admin";

export interface NavigationItem {
  id: string;
  label: string;
  route: string;
  icon?: LucideIcon;
  description?: string;
  /** Subitens (máximo 2 níveis no total: grupo → item → subitem). */
  children?: NavigationItem[];
  /** Rotas antigas que devem resolver para este item. */
  aliases?: string[];
  /** Escondido no menu (rota existe mas não aparece). */
  hidden?: boolean;
}

export interface NavigationGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavigationItem[];
}

export interface NavigationSchema {
  profile: NavigationProfile;
  /** Rota canônica da "home" do perfil. */
  home: string;
  groups: NavigationGroup[];
}

export interface NavigationAlias {
  from: string;
  to: string;
  profile?: NavigationProfile;
}
