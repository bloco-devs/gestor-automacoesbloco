import type { LucideIcon } from "lucide-react";

export type AdminGroupId =
  | "plataforma"
  | "ia"
  | "operacional"
  | "seguranca"
  | "desenvolvimento";

export interface AdminNavItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: AdminGroupId;
  keywords?: string[];
  status?: "novo" | "beta" | "em-breve";
  external?: boolean;
  /** Documentação/rota relacionada exibida no painel contextual. */
  related?: Array<{ label: string; href: string }>;
  /** Descrição estendida usada no painel contextual. */
  details?: string;
}

export interface AdminGroup {
  id: AdminGroupId;
  label: string;
  description: string;
}

export interface AdminQuickAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: AdminGroupId;
}
