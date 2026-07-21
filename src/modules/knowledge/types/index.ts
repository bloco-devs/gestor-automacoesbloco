export type KnowledgeKind = "artigo" | "faq" | "procedimento" | "video" | "documento" | "link";
export type KnowledgeSource = "article" | "similar_demand";
export type KnowledgeOrigin = "portal" | "ai_workspace" | "outro";

export interface KnowledgeItem {
  /** id do artigo OU id da solicitação semelhante */
  id: string;
  source: KnowledgeSource;
  kind: KnowledgeKind | "solicitacao";
  titulo: string;
  resumo: string;
  categoria?: string | null;
  atualizadoEm?: string | null;
  /** 0-100 */
  relevancia: number;
  /** rota interna (React Router) para abrir o item */
  href: string;
  /** link externo (quando `kind === "link"`) */
  urlExterna?: string | null;
}

export interface FeedbackPayload {
  articleId?: string | null;
  demandaSimilarId?: string | null;
  queryText: string;
  resolved: boolean;
  origem: KnowledgeOrigin;
}
