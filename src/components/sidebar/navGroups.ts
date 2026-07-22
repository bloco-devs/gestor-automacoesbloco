import {
  Activity,
  BookOpen,
  Briefcase,
  Clock,
  GanttChartSquare,
  Gauge,
  GitMerge,
  HelpCircle,
  Headphones,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  List,
  ListChecks,
  ListTodo,
  MessageCircleQuestion,
  Network,
  Plus,
  Repeat,
  Settings,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

export type NavItem = {
  to?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  /** Rotas que mantêm o item marcado como ativo (para realçar e auto-abrir). */
  matchPrefix?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

const solicitacoesChildren: NavItem[] = [
  { to: "/solicitacoes", label: "Lista", icon: List },
  { to: "/solicitacoes/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/solicitacoes/gantt", label: "Gantt", icon: GanttChartSquare },
];

const solucoesChildren: NavItem[] = [
  { to: "/solucoes", label: "Lista", icon: List },
  { to: "/solucoes/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/solucoes/gantt", label: "Gantt", icon: GanttChartSquare },
];

export const devGroups: NavGroup[] = [
  {
    id: "trabalho",
    label: "Trabalho",
    icon: Briefcase,
    items: [
      { to: "/trabalho/inbox", label: "Inbox", icon: Inbox },
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { label: "Solicitações", icon: ListChecks, matchPrefix: "/solicitacoes", children: solicitacoesChildren },
      { to: "/atividades", label: "Atividades", icon: KanbanSquare },
    ],
  },
  {
    id: "atendimento",
    label: "Atendimento",
    icon: Headphones,
    items: [
      { to: "/admin/base-conhecimento", label: "Base de Conhecimento", icon: BookOpen },
      { to: "/admin/demandas", label: "Board de Demandas", icon: KanbanSquare },
      { to: "/operacoes", label: "Centro de Operações", icon: Gauge },
    ],
  },
  {
    id: "automacoes",
    label: "Automações",
    icon: Zap,
    items: [
      { to: "/admin/workflows", label: "Workflows", icon: Repeat },
      { label: "Soluções", icon: Sparkles, matchPrefix: "/solucoes", children: solucoesChildren },
      { to: "/diagrama", label: "Diagrama", icon: Network },
      { to: "/observabilidade-ia", label: "Observabilidade IA", icon: Activity },
      { to: "/consolidacao", label: "Consolidação", icon: GitMerge },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: Shield,
    items: [
      { to: "/admin/dashboard", label: "Dashboard (Operação)", icon: Gauge },
      { to: "/admin/configuracoes/sla", label: "Configuração de SLA", icon: Clock },
      { to: "/admin/configuracoes/webhooks", label: "Webhooks & Integrações", icon: Repeat },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    id: "suporte",
    label: "Suporte",
    icon: LifeBuoy,
    items: [{ to: "/ajuda", label: "Ajuda", icon: HelpCircle }],
  },
];

export const requesterGroups: NavGroup[] = [
  {
    id: "trabalho",
    label: "Trabalho",
    icon: Briefcase,
    items: [
      { to: "/portal", label: "Portal", icon: MessageCircleQuestion },
      { to: "/trabalho/inbox", label: "Inbox", icon: Inbox },
      { to: "/dashboard-solicitante", label: "Dashboard", icon: Gauge },
      { to: "/minhas-solicitacoes", label: "Minhas Solicitações", icon: ListTodo },
      { to: "/nova-solicitacao", label: "Nova Solicitação", icon: Plus },
      { label: "Solicitações", icon: ListChecks, matchPrefix: "/solicitacoes", children: solicitacoesChildren },
    ],
  },
  {
    id: "suporte",
    label: "Suporte",
    icon: LifeBuoy,
    items: [{ to: "/ajuda", label: "Ajuda", icon: HelpCircle }],
  },
];

export const builderGroups: NavGroup[] = [
  {
    id: "trabalho",
    label: "Trabalho",
    icon: Briefcase,
    items: [
      { to: "/trabalho/inbox", label: "Inbox", icon: Inbox },
      { to: "/dashboard-solicitante", label: "Dashboard", icon: Gauge },
      { to: "/minhas-solicitacoes", label: "Minhas Solicitações", icon: ListTodo },
      { to: "/nova-solicitacao", label: "Nova Solicitação", icon: Plus },
      { label: "Solicitações", icon: ListChecks, matchPrefix: "/solicitacoes", children: solicitacoesChildren },
    ],
  },
  {
    id: "automacoes",
    label: "Automações",
    icon: Zap,
    items: [
      { label: "Soluções", icon: Sparkles, matchPrefix: "/solucoes", children: solucoesChildren },
      { to: "/diagrama", label: "Diagrama", icon: Network },
    ],
  },
  {
    id: "suporte",
    label: "Suporte",
    icon: LifeBuoy,
    items: [{ to: "/ajuda", label: "Ajuda", icon: HelpCircle }],
  },
];

/**
 * Localiza o grupo/item que casa com a rota atual.
 * Retorna [grupo, item, child?] para uso em breadcrumb e auto-expand.
 */
export function findActive(
  groups: NavGroup[],
  pathname: string,
): { group: NavGroup; item: NavItem; child?: NavItem } | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.to && (pathname === item.to || pathname.startsWith(item.to + "/"))) {
        return { group, item };
      }
      if (item.matchPrefix && (pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/"))) {
        const child = item.children?.find(
          (c) => c.to && (pathname === c.to || pathname.startsWith(c.to + "/")),
        );
        return { group, item, child };
      }
      if (item.children) {
        for (const c of item.children) {
          if (c.to && (pathname === c.to || pathname.startsWith(c.to + "/"))) {
            return { group, item, child: c };
          }
        }
      }
    }
  }
  return null;
}
