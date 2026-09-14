/**
 * UnifiedNavigationRegistry — fonte única de navegação por perfil.
 * Feature-flagged por `ux.rewrite`. Aditivo, não altera navegação legada.
 */
import {
  FolderKanban,
  Home,
  Inbox as InboxIcon,
  BookOpen,
  ListTodo,
  Wrench,
  Terminal,
  LineChart,
  Users,
  Radar,
  Shield,
  FileClock,
  Plug,
  Layers,
  UserCog,
  Sparkles,
} from "lucide-react";
import type { NavigationAlias, NavigationProfile, NavigationSchema } from "./types";

/* ------------------------------------------------------------------ */
/* Schemas por perfil                                                  */
/* ------------------------------------------------------------------ */

const PORTAL: NavigationSchema = {
  profile: "portal",
  home: "/portal/inicio",
  groups: [
    {
      id: "portal-main",
      label: "Portal",
      items: [
        { id: "portal.inicio", label: "Início", route: "/portal/inicio", icon: Home, aliases: ["/portal"] },
        {
          id: "portal.minhas-demandas",
          label: "Minhas Demandas",
          route: "/portal/demandas",
          icon: ListTodo,
          aliases: ["/minhas-solicitacoes", "/minhas-demandas"],
        },
        {
          id: "portal.conhecimento",
          label: "Conhecimento",
          route: "/portal/conhecimento",
          icon: BookOpen,
          aliases: ["/portal/central"],
        },
        { id: "portal.inbox", label: "Inbox", route: "/portal/inbox", icon: InboxIcon, aliases: ["/trabalho/inbox"] },
      ],
    },
  ],
};

const WORKSPACE: NavigationSchema = {
  profile: "workspace",
  home: "/workspace",
  groups: [
    {
      id: "workspace-main",
      label: "Workspace",
      items: [
        { id: "ws.hoje", label: "Hoje", route: "/workspace", icon: Home, aliases: ["/dashboard", "/workspace/hoje"] },
        /*
         * "Demandas" leva ao que CHEGOU; "Projetos" leva ao que está sendo
         * construído. A ordem é a do fluxo, e a separação existe porque ela
         * faltava: havia um único item chamado "Demandas" que abria a tela de
         * Projetos (os quadros), e quem procurava as demandas recebidas
         * clicava nele, via uma lista de quadros e concluía que a caixa de
         * entrada tinha sumido.
         *
         * São tabelas diferentes, não duas vistas da mesma coisa: `demands`
         * guarda o que a conversa com o Blink criou, `atividades_boards` os
         * quadros. Um rótulo só para as duas não tinha como estar certo.
         */
        {
          id: "ws.demandas",
          label: "Demandas",
          route: "/admin/demandas",
          icon: InboxIcon,
          aliases: ["/board-demandas"],
        },
        {
          id: "ws.projetos",
          label: "Projetos",
          route: "/workspace/demandas",
          icon: FolderKanban,
          aliases: [
            "/atividades",
            "/solicitacoes",
            "/solicitacoes/kanban",
            "/kanban",
          ],
        },
        { id: "ws.builder", label: "Builder", route: "/workspace/builder", icon: Wrench, aliases: ["/admin/workflows", "/studio"] },
        { id: "ws.devtools", label: "DevTools", route: "/workspace/devtools", icon: Terminal, aliases: ["/developer"] },
        /*
         * O "Inbox" continua fora, e agora por um motivo verificado em vez de
         * herdado: ele lista `solicitacoes` — a tabela do fluxo antigo —, não
         * `demands`. Recolocá-lo como atalho para "ver o que chegou" mostraria
         * outra coisa. Quem precisar da tela continua chegando por /trabalho
         * /inbox ou pela busca (⌘K).
         */
      ],
    },
  ],
};

const GESTAO: NavigationSchema = {
  profile: "gestao",
  home: "/gestao/panorama",
  groups: [
    {
      id: "gestao-main",
      label: "Gestão",
      items: [
        {
          id: "gestao.panorama",
          label: "Panorama",
          route: "/gestao/panorama",
          icon: Radar,
          aliases: ["/command-center", "/operacoes"],
        },
        { id: "gestao.equipe", label: "Equipe", route: "/gestao/equipe", icon: Users },
        { id: "gestao.demandas", label: "Demandas", route: "/gestao/demandas", icon: ListTodo },
        {
          id: "gestao.insights",
          label: "Insights",
          route: "/gestao/insights",
          icon: LineChart,
          aliases: ["/admin/analytics", "/admin/saude", "/admin/observability", "/admin/quality", "/admin/platform-health"],
        },
        { id: "gestao.inbox", label: "Inbox", route: "/gestao/inbox", icon: InboxIcon, aliases: ["/trabalho/inbox"] },
      ],
    },
  ],
};

const ADMIN: NavigationSchema = {
  profile: "admin",
  home: "/admin/plataforma",
  groups: [
    {
      id: "admin-main",
      label: "Admin",
      items: [
        { id: "admin.plataforma", label: "Plataforma", route: "/admin/plataforma", icon: Layers, aliases: ["/admin"] },
        { id: "admin.pessoas", label: "Pessoas", route: "/admin/pessoas", icon: UserCog },
        {
          id: "admin.integracoes",
          label: "Integrações",
          route: "/admin/integracoes",
          icon: Plug,
          aliases: ["/admin/integrations"],
        },
        {
          id: "admin.conhecimento",
          label: "Conhecimento",
          route: "/admin/conhecimento",
          icon: BookOpen,
          aliases: ["/admin/base-conhecimento"],
        },
        { id: "admin.seguranca", label: "Segurança", route: "/admin/seguranca", icon: Shield, aliases: ["/admin/security"] },
        { id: "admin.auditoria", label: "Auditoria", route: "/admin/auditoria", icon: FileClock, aliases: ["/admin/audit"] },
      ],
    },
  ],
};

const SCHEMAS: Record<NavigationProfile, NavigationSchema> = {
  portal: PORTAL,
  workspace: WORKSPACE,
  gestao: GESTAO,
  admin: ADMIN,
};

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

export function getNavigation(profile: NavigationProfile): NavigationSchema {
  return SCHEMAS[profile];
}

export function listProfiles(): NavigationProfile[] {
  return Object.keys(SCHEMAS) as NavigationProfile[];
}

/** Retorna todos os aliases (rota antiga → rota nova canônica). */
export function listAliases(): NavigationAlias[] {
  const out: NavigationAlias[] = [];
  for (const schema of Object.values(SCHEMAS)) {
    for (const group of schema.groups) {
      for (const item of group.items) {
        (item.aliases ?? []).forEach((from) => {
          out.push({ from, to: item.route, profile: schema.profile });
        });
      }
    }
  }
  return out;
}

/* Ícone marker exportado — evita import morto */
export const NAV_ICON_ACCENT = Sparkles;
