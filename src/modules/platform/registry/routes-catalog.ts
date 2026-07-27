import { ADMIN_GROUPS, ADMIN_NAV } from "@/modules/admin-shell/navigation/registry";
import { getNavigation, type NavigationProfile } from "@/modules/navigation";
import type { NavCategory, NavItem } from "../types";

/**
 * Catálogo de rotas para a paleta de comandos (⌘K).
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O sistema tem 101 rotas. A paleta conhecia 16. Isso é o que tornava a
 * navegação impossível de enxugar: tirar um item do menu significava tornar a
 * página inalcançável, então tudo ficava no menu — 69 itens de uma vez, para
 * todo mundo, em toda sessão.
 *
 * A regra de produto por trás disso: **navegação serve exploração, busca serve
 * intenção**. Quem precisa do Threat Center sabe que precisa dele — não vai
 * descobri-lo passeando por um menu. Colocar essas telas no menu é usar a
 * ferramenta errada e cobrar o custo de 60 linhas de ruído de quem só quer
 * abrir uma demanda.
 *
 * Com a paleta indexando tudo, o menu pode finalmente carregar só os 5
 * destinos do dia a dia.
 *
 * Nenhuma rota nova é criada aqui: é um índice sobre destinos que já existem.
 */

/** As categorias do admin-shell mapeadas para as da paleta. */
const CATEGORIA_POR_GRUPO: Record<string, NavCategory> = {
  plataforma: "Sistema",
  ia: "IA",
  operacional: "Configuração",
  seguranca: "Sistema",
  desenvolvimento: "Sistema",
};

const ROTULO_GRUPO = new Map(ADMIN_GROUPS.map((g) => [g.id, g.label]));

/**
 * As ~56 páginas administrativas. Já estavam catalogadas com descrição,
 * ícone e palavras-chave em `ADMIN_NAV` — só nunca tinham sido oferecidas
 * à busca. Reaproveitar esse registro evita manter duas listas que
 * divergiriam na primeira feature nova.
 */
function doAdminShell(): NavItem[] {
  return ADMIN_NAV.filter((item) => !item.external && item.status !== "em-breve").map((item) => ({
    id: `admin:${item.id}`,
    title: item.label,
    description: item.description,
    route: item.href,
    category: CATEGORIA_POR_GRUPO[item.group] ?? "Sistema",
    // O rótulo do grupo entra como palavra-chave para que buscar "segurança"
    // traga tudo daquele grupo, mesmo sem o termo estar no título.
    keywords: [...(item.keywords ?? []), ROTULO_GRUPO.get(item.group) ?? "", "admin"].filter(Boolean),
    icon: item.icon,
    permissions: ["developer", "administrador"],
  }));
}

/** Os destinos de cada persona, vindos do mesmo registry que alimenta o menu. */
function dosPerfis(): NavItem[] {
  const perfis: NavigationProfile[] = ["portal", "workspace", "gestao", "admin"];
  const vistos = new Set<string>();
  const itens: NavItem[] = [];

  for (const perfil of perfis) {
    for (const grupo of getNavigation(perfil).groups) {
      for (const item of grupo.items) {
        if (item.hidden || vistos.has(item.route)) continue;
        vistos.add(item.route);
        itens.push({
          id: `nav:${item.id}`,
          title: item.label,
          route: item.route,
          category: perfil === "portal" ? "Solicitações" : "Trabalho",
          keywords: [grupo.label, perfil],
          icon: item.icon,
        });
      }
    }
  }
  return itens;
}

/**
 * As lentes do Workspace como destinos próprios.
 *
 * Sem isto, buscar "gantt" não acharia nada: o Gantt não é uma rota, é um
 * parâmetro. Do ponto de vista de quem busca, porém, ele é um lugar — e a
 * paleta precisa concordar com o modelo mental do usuário, não com o do
 * roteador.
 */
function dasLentes(): NavItem[] {
  const lentes: Array<{ id: string; titulo: string; termos: string[] }> = [
    { id: "lista", titulo: "Demandas — Lista", termos: ["lista", "issues", "backlog"] },
    { id: "board", titulo: "Demandas — Board", termos: ["board", "kanban", "quadro", "colunas"] },
    { id: "sprint", titulo: "Demandas — Sprint", termos: ["sprint", "ciclo", "entrega"] },
    { id: "timeline", titulo: "Demandas — Timeline", termos: ["timeline", "atividade", "histórico"] },
    { id: "gantt", titulo: "Demandas — Gantt", termos: ["gantt", "cronograma", "calendário", "prazo"] },
  ];

  return lentes.map((l) => ({
    id: `lente:${l.id}`,
    title: l.titulo,
    description: "Mesma fonte de dados, outra forma de visualizar",
    route: `/workspace/demandas?lente=${l.id}`,
    category: "Trabalho" as NavCategory,
    keywords: [...l.termos, "demandas", "visualização"],
    permissions: ["developer", "administrador"],
  }));
}

/** As filas — recortes, não rotas. Mesmo raciocínio das lentes. */
function dosProjetos(): NavItem[] {
  return [
    {
      id: "nav:projetos",
      title: "Projetos",
      description: "Escolher em qual projeto trabalhar",
      route: "/workspace/demandas",
      category: "Trabalho" as NavCategory,
      // "quadro" e "atividades" continuam como palavras-chave: o vocabulario
      // saiu da interface, mas nao da cabeca de quem usava o sistema antes.
      // Busca serve intencao, e a intencao ainda se chama pelo nome velho.
      keywords: ["projetos", "quadros", "atividades", "boards", "trocar de projeto"],
      permissions: ["developer", "administrador"],
    },
  ];
}

function dasFilas(): NavItem[] {
  const filas: Array<{ id: string; titulo: string; termos: string[] }> = [
    { id: "minhas", titulo: "Minhas demandas", termos: ["minhas", "atribuídas", "meu"] },
    { id: "sem_responsavel", titulo: "Demandas não atribuídas", termos: ["sem dono", "não atribuídas", "livre"] },
    { id: "vencendo_hoje", titulo: "Demandas vencendo hoje", termos: ["hoje", "prazo", "vencendo"] },
    { id: "em_risco", titulo: "Demandas em risco", termos: ["risco", "atrasadas", "sla", "críticas"] },
  ];

  return filas.map((f) => ({
    id: `fila:${f.id}`,
    title: f.titulo,
    route: `/workspace/demandas?fila=${f.id}`,
    category: "Trabalho" as NavCategory,
    keywords: [...f.termos, "fila", "demandas"],
    permissions: ["developer", "administrador"],
  }));
}

/**
 * Tudo que a paleta deve conhecer. Deduplicado por rota: se um destino aparece
 * no menu e no admin-shell, entra uma vez só.
 */
export function catalogoDeRotas(): NavItem[] {
  const todos = [...dosPerfis(), ...dosProjetos(), ...dasFilas(), ...dasLentes(), ...doAdminShell()];
  const porRota = new Map<string, NavItem>();
  for (const item of todos) {
    if (!porRota.has(item.route)) porRota.set(item.route, item);
  }
  return [...porRota.values()];
}
