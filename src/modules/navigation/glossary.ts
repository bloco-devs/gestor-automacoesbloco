/**
 * ProductGlossary — Nomenclatura oficial do produto.
 * Todo texto novo deve usar apenas os termos canônicos.
 * O produto reconhece apenas DOIS objetos centrais: Demanda e Conhecimento.
 */

export const ProductGlossary = {
  // Objetos centrais
  demand: "Demanda",
  demands: "Demandas",
  knowledge: "Conhecimento",

  // Navegação
  home: "Início",
  today: "Hoje",
  overview: "Panorama",
  team: "Equipe",
  insights: "Insights",
  inbox: "Inbox",
  builder: "Builder",
  devtools: "DevTools",
  platform: "Plataforma",
  people: "Pessoas",
  integrations: "Integrações",
  security: "Segurança",
  audit: "Auditoria",
} as const;

/** Mapa de termos legados → termo oficial. Fonte da verdade para textos. */
export const LEGACY_TERMS: Record<string, string> = {
  // Objetos → Demanda
  solicitação: ProductGlossary.demand,
  solicitacao: ProductGlossary.demand,
  solicitacoes: ProductGlossary.demands,
  solicitações: ProductGlossary.demands,
  chamado: ProductGlossary.demand,
  chamados: ProductGlossary.demands,
  ticket: ProductGlossary.demand,
  tickets: ProductGlossary.demands,
  atividade: ProductGlossary.demand,
  atividades: ProductGlossary.demands,
  card: ProductGlossary.demand,
  cards: ProductGlossary.demands,
  task: ProductGlossary.demand,
  tasks: ProductGlossary.demands,

  // Navegação
  dashboard: ProductGlossary.home,
  "centro operacional": ProductGlossary.overview,
  "command center": ProductGlossary.overview,
  operações: ProductGlossary.team,
  operacoes: ProductGlossary.team,
};

/** Normaliza um termo legado para o glossário oficial. */
export function normalizeTerm(input: string): string {
  const key = input.trim().toLowerCase();
  return LEGACY_TERMS[key] ?? input;
}

export type ProductGlossaryKey = keyof typeof ProductGlossary;
