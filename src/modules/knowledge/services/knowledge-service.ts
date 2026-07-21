import { supabase } from "@/integrations/supabase/client";
import type { FeedbackPayload, KnowledgeItem, KnowledgeKind } from "../types";

interface ArticleRow {
  id: string;
  tipo: KnowledgeKind;
  titulo: string;
  resumo: string | null;
  categoria: string | null;
  sistema_slug: string | null;
  url_externa: string | null;
  updated_at: string;
  relevancia: number | null;
}

interface SimilarRow {
  id: string;
  titulo: string;
  similaridade: number;
  motivo: string;
}

/**
 * Busca artigos publicados via RPC `knowledge_search` (full-text pt-BR).
 * Retorna vazio silenciosamente em qualquer erro — a UI segue funcionando.
 */
async function searchArticles(query: string, limit = 5): Promise<KnowledgeItem[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase.rpc("knowledge_search", { _q: q, _limit: limit });
  if (error || !Array.isArray(data)) return [];
  return (data as ArticleRow[]).map((r) => {
    const rel = Number(r.relevancia ?? 0);
    // ts_rank_cd é ilimitado; escala grosseira para 0-100.
    const normalized = Math.max(0, Math.min(100, Math.round(rel * 100)));
    return {
      id: r.id,
      source: "article",
      kind: r.tipo,
      titulo: r.titulo,
      resumo: (r.resumo ?? "").trim(),
      categoria: r.categoria,
      atualizadoEm: r.updated_at,
      relevancia: normalized || 60,
      href: r.url_externa ? r.url_externa : `/ajuda?artigo=${r.id}`,
      urlExterna: r.url_externa,
    };
  });
}

/** Reusa a Edge Function `demandas-similares` — nada de duplicação. */
async function searchSimilarDemands(query: string): Promise<KnowledgeItem[]> {
  const q = query.trim();
  if (q.length < 25) return [];
  try {
    const { data, error } = await supabase.functions.invoke("demandas-similares", {
      body: { titulo: q.slice(0, 80), descricao: q },
    });
    if (error) return [];
    const list = (data as { similares?: SimilarRow[] } | null)?.similares ?? [];
    return list.map((it) => ({
      id: it.id,
      source: "similar_demand",
      kind: "solicitacao",
      titulo: it.titulo,
      resumo: it.motivo,
      categoria: "Solicitação semelhante",
      atualizadoEm: null,
      relevancia: it.similaridade,
      href: `/solicitacao/${it.id}`,
    }));
  } catch {
    return [];
  }
}

export const knowledgeService = {
  /** Combina artigos + demandas parecidas e ordena por relevância. */
  async search(query: string): Promise<KnowledgeItem[]> {
    const [articles, similar] = await Promise.all([
      searchArticles(query, 5),
      searchSimilarDemands(query),
    ]);
    return [...articles, ...similar].sort((a, b) => b.relevancia - a.relevancia).slice(0, 6);
  },

  /** Grava feedback (resolveu / não resolveu). Silencia erros para não travar a UX. */
  async recordFeedback(payload: FeedbackPayload): Promise<void> {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id ?? null;
      await supabase.from("knowledge_feedback").insert({
        user_id: userId,
        article_id: payload.articleId ?? null,
        demanda_similar_id: payload.demandaSimilarId ?? null,
        query_text: payload.queryText.slice(0, 500),
        resolved: payload.resolved,
        origem: payload.origem,
      });
    } catch {
      /* silencioso */
    }
  },
};

export type KnowledgeService = typeof knowledgeService;
