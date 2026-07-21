import type { Database } from "@/integrations/supabase/types";

export type ArticleRow = Database["public"]["Tables"]["knowledge_articles"]["Row"];
export type ArticleInsert = Database["public"]["Tables"]["knowledge_articles"]["Insert"];
export type ArticleUpdate = Database["public"]["Tables"]["knowledge_articles"]["Update"];

export const ARTICLE_STATUSES = ["rascunho", "em_revisao", "publicado", "arquivado"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_TYPES = ["artigo", "faq", "procedimento", "video", "documento", "link"] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export interface ArticleVersion {
  id: string;
  article_id: string;
  versao: number;
  snapshot: Record<string, unknown>;
  changed_by: string | null;
  changed_by_email: string | null;
  resumo_alteracao: string | null;
  created_at: string;
}

export interface AdminMetrics {
  total: number;
  publicados: number;
  rascunhos: number;
  emRevisao: number;
  arquivados: number;
  excluidos: number;
  views: number;
  taxaResolucao: number; // 0-1
  ultimaAtualizacao: string | null;
  autores: number;
}

export interface ArticleFilters {
  search: string;
  status: ArticleStatus | "todos";
  tipo: ArticleType | "todos";
  categoria: string | "todos";
}
