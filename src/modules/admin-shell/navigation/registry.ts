import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Bug,
  Building2,
  Gauge,
  Cog,
  FileCode2,
  FileWarning,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Mail,
  Network,
  PlusCircle,
  Radar,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";
import type { AdminGroup, AdminNavItem, AdminQuickAction } from "../types";

export const ADMIN_GROUPS: AdminGroup[] = [
  { id: "plataforma", label: "Plataforma", description: "Saúde, analytics e observabilidade." },
  { id: "ia", label: "IA & Conhecimento", description: "Prompts, base de conhecimento e roteamento." },
  { id: "operacional", label: "Operacional", description: "Workflows, SLA, integrações e portal." },
  { id: "seguranca", label: "Segurança", description: "Usuários, papéis, permissões e sessões." },
  { id: "desenvolvimento", label: "Desenvolvimento", description: "Diagramas, ecossistema e diagnóstico." },
];

/**
 * Registry ESTÁTICO das entradas do AdminHub 2.0.
 * Nenhuma rota nova — apenas reorganização visual dos destinos existentes.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  // Plataforma
  {
    id: "saude",
    group: "plataforma",
    label: "Centro de Saúde",
    description: "Status consolidado de todas as camadas.",
    href: "/admin/saude",
    icon: Activity,
    keywords: ["health", "status", "uptime"],
    related: [{ label: "Command Center", href: "/command-center" }],
    details: "Painel de saúde da plataforma (HUB, edge, banco, filas).",
  },
  {
    id: "analytics",
    group: "plataforma",
    label: "Analytics",
    description: "Volumes, tendências, SLA e afinidade.",
    href: "/admin/analytics",
    icon: BarChart3,
    keywords: ["kpi", "métricas", "relatórios"],
    related: [{ label: "Operações", href: "/operacoes" }],
    details: "9 fontes agregadas em memória. Suporta exportação CSV.",
  },
  {
    id: "observabilidade",
    group: "plataforma",
    label: "Observabilidade IA",
    description: "Uso, custo e erros por edge function.",
    href: "/observabilidade-ia",
    icon: Sparkles,
    keywords: ["ai", "logs", "uso"],
    details: "Alimentado por ia_uso_log.",
  },
  {
    id: "dashboard-admin",
    group: "plataforma",
    label: "Dashboard Admin",
    description: "Visão consolidada de tickets e SLA.",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  // FEATURE 023 — Production Hardening
  {
    id: "sessions-center",
    group: "seguranca",
    label: "Session Center",
    description: "Sessão ativa, browser, OS.",
    href: "/admin/sessions",
    icon: Users,
    status: "novo",
  },

  // FEATURE 024 — Enterprise Security


  // IA & Conhecimento
  {
    id: "knowledge",
    group: "ia",
    label: "Base de Conhecimento",
    description: "Artigos, versões e deflexão.",
    href: "/admin/base-conhecimento",
    icon: BookOpen,
  },
  {
    id: "routing",
    group: "ia",
    label: "Roteamento inteligente",
    description: "Sugestão de responsáveis por afinidade.",
    href: "/operacoes",
    icon: Network,
    keywords: ["smart routing", "afinidade"],
    details: "O motor roda embarcado em /operacoes e /workspace.",
  },
  {
    id: "workflow",
    group: "ia",
    label: "Workflows",
    description: "Editor visual de automações.",
    href: "/admin/workflows",
    icon: Workflow,
    related: [
      { label: "Execuções", href: "/admin/workflows/execucoes" },
      { label: "Novo workflow", href: "/admin/workflows/novo" },
    ],
  },

  // Operacional
  {
    id: "webhooks",
    group: "operacional",
    label: "Webhooks",
    description: "Integrações de saída e testes.",
    href: "/admin/configuracoes/webhooks",
    icon: Webhook,
  },
  {
    id: "sla",
    group: "operacional",
    label: "Políticas de SLA",
    description: "Tempos de atendimento por prioridade.",
    href: "/admin/configuracoes/sla",
    icon: ShieldCheck,
  },
  {
    id: "notificacoes-email",
    group: "operacional",
    label: "Avisos por e-mail",
    description: "O que foi enviado aos solicitantes, e o que falhou.",
    href: "/admin/notificacoes-email",
    icon: Mail,
  },
  {
    id: "portal",
    group: "operacional",
    label: "Portal do Solicitante",
    description: "Experiência pública de abertura.",
    href: "/portal",
    icon: Inbox,
  },
  {
    id: "demandas-board",
    group: "operacional",
    label: "Board de Demandas",
    description: "Kanban gerencial em tempo real.",
    href: "/admin/demandas",
    icon: ListChecks,
  },

  // Segurança
  {
    id: "usuarios",
    group: "seguranca",
    label: "Usuários",
    description: "Convites, status e perfil de acesso.",
    href: "/configuracoes",
    icon: Users,
  },
  {
    id: "papeis",
    group: "seguranca",
    label: "Papéis & permissões",
    description: "Requester, developer e admin.",
    href: "/configuracoes#perfis",
    icon: ShieldCheck,
  },

  // Desenvolvimento
  {
    id: "diagrama",
    group: "desenvolvimento",
    label: "Diagramas",
    description: "Mapa vivo do ecossistema.",
    href: "/diagrama",
    icon: Network,
  },
  {
    id: "escritorio",
    group: "desenvolvimento",
    label: "Escritório do Ecossistema",
    description: "O ecossistema em bonecos: quem trabalha, quem está parado e quem conversa com quem.",
    href: "/escritorio",
    icon: Building2,
  },
  {
    id: "ecossistema",
    group: "desenvolvimento",
    label: "Ecossistema",
    description: "Catálogo HUB + local, saúde por sistema.",
    href: "/ecossistema",
    icon: Boxes,
  },
  {
    id: "terminal-legado",
    group: "desenvolvimento",
    label: "AdminHub legado",
    description: "Versão anterior preservada.",
    href: "/admin/legado",
    icon: Terminal,
  },
];

export const ADMIN_QUICK_ACTIONS: AdminQuickAction[] = [
  { id: "novo-workflow", label: "Criar Workflow", href: "/admin/workflows/novo", icon: PlusCircle, group: "operacional" },
  { id: "novo-webhook", label: "Criar Webhook", href: "/admin/configuracoes/webhooks", icon: Webhook, group: "operacional" },
  { id: "nova-sla", label: "Nova Política SLA", href: "/admin/configuracoes/sla", icon: ShieldCheck, group: "operacional" },
  { id: "nova-integracao", label: "Nova Integração", href: "/ecossistema", icon: Boxes, group: "operacional" },
  { id: "abrir-analytics", label: "Abrir Analytics", href: "/admin/analytics", icon: BarChart3, group: "plataforma" },
  { id: "abrir-saude", label: "Centro de Saúde", href: "/admin/saude", icon: Activity, group: "plataforma" },
  { id: "abrir-ecossistema", label: "Ecossistema", href: "/ecossistema", icon: Boxes, group: "desenvolvimento" },
  { id: "abrir-knowledge", label: "Base de Conhecimento", href: "/admin/base-conhecimento", icon: BookOpen, group: "ia" },
  { id: "abrir-routing", label: "Roteamento", href: "/operacoes", icon: Radar, group: "ia" },
];

export function groupNav(items: AdminNavItem[] = ADMIN_NAV) {
  return ADMIN_GROUPS.map((group) => ({
    ...group,
    items: items.filter((it) => it.group === group.id),
  }));
}
