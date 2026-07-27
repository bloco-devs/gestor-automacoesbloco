import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  Clock,
  Code2,
  GanttChartSquare,
  Gauge,
  GitMerge,
  HelpCircle,
  Headphones,
  Inbox,
  Layers,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  List,
  ListChecks,
  ListTodo,
  MessageCircleQuestion,
  Network,
  Plus,
  Plug,
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
      { to: "/command-center", label: "Command Center", icon: Gauge },
      { to: "/workspace", label: "Workspace", icon: Layers },
      { to: "/trabalho/inbox", label: "Inbox", icon: Inbox },
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { label: "Solicitações", icon: ListChecks, matchPrefix: "/solicitacoes", children: solicitacoesChildren },
      // "Atividades" era o nome que veio com a importacao do Trello, e o icone
      // de kanban ensinava que o objeto e o quadro. O destino e o mesmo; o
      // nome agora e o do conceito de produto.
      { to: "/workspace/demandas", label: "Projetos", icon: FolderKanban },
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
      { to: "/admin", label: "Admin Hub", icon: Shield },
      { to: "/admin/dashboard", label: "Dashboard (Operação)", icon: Gauge },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/saude", label: "Centro de Saúde", icon: Activity },
      { to: "/admin/observability", label: "Observabilidade", icon: Activity },
      { to: "/admin/integrations", label: "Integrações", icon: Plug, matchPrefix: "/admin/integrations" },
      { to: "/admin/configuracoes/sla", label: "Configuração de SLA", icon: Clock },
      { to: "/admin/configuracoes/webhooks", label: "Webhooks & Integrações", icon: Repeat },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    id: "developer",
    label: "Developer",
    icon: Code2,
    items: [
      { to: "/developer", label: "Visão Geral", icon: Code2 },
      { to: "/developer/runtime", label: "Runtime", icon: Activity },
      { to: "/developer/query", label: "Query", icon: Layers },
      { to: "/developer/services", label: "Service Mesh", icon: Network },
      { to: "/developer/plugins", label: "Plugins", icon: Sparkles },
      { to: "/developer/ai", label: "AI Diagnostics", icon: Sparkles },
      { to: "/developer/workflows", label: "Workflows", icon: Repeat },
      { to: "/developer/performance", label: "Performance", icon: Gauge },
      { to: "/developer/dependencies", label: "Dependências", icon: GitMerge },
      { to: "/developer/quality", label: "Code Health", icon: Activity },
      { to: "/developer/docs", label: "Docs", icon: BookOpen },
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
 *
 * ERA "primeiro que casar", virou "o mais específico que casar". Com
 * primeiro-que-casa, `/workspace/devtools` batia em "Hoje" (`to: "/workspace"`)
 * antes de chegar em "DevTools" (`to: "/workspace/devtools"`) — qualquer rota
 * aninhada sob um item cujo `to` é prefixo de outro tinha o mesmo risco. Agora
 * cada candidato carrega o comprimento do trecho que casou, e o mais longo
 * vence — uma correspondência exata sempre tem o maior comprimento possível,
 * então continua ganhando de qualquer prefixo.
 */
export function findActive(
  groups: NavGroup[],
  pathname: string,
): { group: NavGroup; item: NavItem; child?: NavItem } | null {
  type Candidato = { group: NavGroup; item: NavItem; child?: NavItem; comprimento: number };
  let melhor: Candidato | null = null;

  const considerar = (candidato: Candidato) => {
    if (!melhor || candidato.comprimento > melhor.comprimento) melhor = candidato;
  };

  for (const group of groups) {
    for (const item of group.items) {
      if (item.to && (pathname === item.to || pathname.startsWith(item.to + "/"))) {
        considerar({ group, item, comprimento: item.to.length });
      }
      if (item.matchPrefix && (pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/"))) {
        const child = item.children?.find(
          (c) => c.to && (pathname === c.to || pathname.startsWith(c.to + "/")),
        );
        considerar({ group, item, child, comprimento: (child?.to ?? item.matchPrefix).length });
      }
      if (item.children) {
        for (const c of item.children) {
          if (c.to && (pathname === c.to || pathname.startsWith(c.to + "/"))) {
            considerar({ group, item, child: c, comprimento: c.to.length });
          }
        }
      }
    }
  }

  return melhor;
}
