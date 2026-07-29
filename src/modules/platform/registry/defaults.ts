import { Activity, HelpCircle, Inbox, KanbanSquare, LayoutDashboard, ListChecks, Network, Plus, Settings, Sparkles } from "lucide-react";
import type { NavItem, PlatformCommand } from "../types";

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    id: "inbox",
    title: "Inbox",
    description: "Central de trabalho inteligente",
    route: "/trabalho/inbox",
    category: "Trabalho",
    keywords: ["inbox", "tarefas", "hoje", "prioridade"],
    icon: Inbox,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Visão geral do desenvolvedor",
    route: "/dashboard",
    category: "Trabalho",
    keywords: ["dashboard", "kpi", "resumo"],
    icon: LayoutDashboard,
    permissions: ["developer", "administrador"],
  },
  {
    id: "nova-solicitacao",
    title: "Nova Solicitação",
    description: "Abrir AI Workspace para nova demanda",
    route: "/nova-solicitacao",
    category: "Solicitações",
    keywords: ["nova", "criar", "demanda", "solicitar", "ai", "workspace"],
    icon: Plus,
  },
  {
    id: "solucoes",
    title: "Soluções",
    description: "Lista de soluções entregues",
    route: "/solucoes",
    category: "Soluções",
    keywords: ["soluções", "entregas"],
    icon: Sparkles,
    permissions: ["developer", "administrador"],
  },
  {
    id: "solucoes-kanban",
    title: "Soluções — Kanban",
    route: "/solucoes/kanban",
    category: "Soluções",
    keywords: ["kanban", "soluções"],
    icon: KanbanSquare,
    permissions: ["developer", "administrador"],
  },
  {
    id: "atividades",
    title: "Atividades",
    description: "Quadros e sprints",
    route: "/atividades",
    category: "Atividades",
    keywords: ["atividades", "board", "sprint", "cards", "trello"],
    icon: KanbanSquare,
    permissions: ["developer", "administrador"],
  },
  {
    id: "diagrama",
    title: "Diagrama",
    description: "Mapa do ecossistema",
    route: "/diagrama",
    category: "IA",
    keywords: ["diagrama", "mapa", "ecossistema"],
    icon: Network,
    permissions: ["developer", "administrador"],
  },
  {
    id: "observabilidade-ia",
    title: "Observabilidade IA",
    description: "Uso e custos da IA",
    route: "/observabilidade-ia",
    category: "IA",
    keywords: ["observabilidade", "ia", "logs", "tokens"],
    icon: Activity,
    permissions: ["developer", "administrador"],
  },
  {
    id: "configuracoes",
    title: "Configurações",
    route: "/configuracoes",
    category: "Configuração",
    keywords: ["config", "settings"],
    icon: Settings,
    permissions: ["developer", "administrador"],
  },
  {
    id: "ajuda",
    title: "Ajuda",
    route: "/ajuda",
    category: "Ajuda",
    keywords: ["ajuda", "help", "suporte"],
    icon: HelpCircle,
  },
  {
    id: "perfil",
    title: "Meu Perfil",
    route: "/perfil",
    category: "Configuração",
    keywords: ["perfil", "avatar", "conta"],
    icon: ListChecks,
  },
];

export const DEFAULT_COMMANDS: PlatformCommand[] = [
  {
    id: "cmd.open-inbox",
    title: "Abrir Inbox",
    description: "Ir para a central de trabalho",
    shortcut: "mod+shift+i",
    category: "Navegar",
    icon: Inbox,
    handler: ({ navigate, closePalette }) => {
      navigate("/trabalho/inbox");
      closePalette();
    },
  },
  {
    id: "cmd.open-dashboard",
    title: "Abrir Dashboard",
    shortcut: "mod+shift+d",
    category: "Navegar",
    icon: LayoutDashboard,
    handler: ({ navigate, closePalette }) => {
      navigate("/dashboard");
      closePalette();
    },
  },
  {
    id: "cmd.open-sprint",
    title: "Abrir Sprint / Atividades",
    category: "Navegar",
    icon: ListChecks,
    handler: ({ navigate, closePalette }) => {
      navigate("/atividades");
      closePalette();
    },
    permissions: ["developer", "administrador"],
  },
  {
    id: "cmd.open-ai-workspace",
    title: "Abrir AI Workspace",
    description: "Iniciar nova conversa com a IA",
    shortcut: "mod+shift+a",
    category: "IA",
    icon: Sparkles,
    handler: ({ navigate, closePalette }) => {
      navigate("/nova-solicitacao");
      closePalette();
    },
  },
  {
    id: "cmd.new-request",
    title: "Nova Solicitação",
    shortcut: "mod+shift+n",
    category: "Criar",
    icon: Plus,
    handler: ({ navigate, closePalette }) => {
      navigate("/nova-solicitacao");
      closePalette();
    },
  },
  {
    id: "cmd.open-settings",
    title: "Abrir Configurações",
    category: "Configuração",
    icon: Settings,
    handler: ({ navigate, closePalette }) => {
      navigate("/configuracoes");
      closePalette();
    },
    permissions: ["developer", "administrador"],
  },
];
