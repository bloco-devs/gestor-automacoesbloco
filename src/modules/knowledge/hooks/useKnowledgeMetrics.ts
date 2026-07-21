import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface KnowledgeMetrics {
  loading: boolean;
  solicitacoesEvitadas: number;
  totalFeedback: number;
  taxaResolucao: number; // 0-100
  topArtigos: Array<{ article_id: string; titulo: string; resolvidas: number }>;
}

/**
 * Métricas agregadas para o Dashboard: só o admin enxerga tudo (via RLS).
 * Estratégia: consulta simples ao `knowledge_feedback` (30 dias) + join opcional
 * com `knowledge_articles`. Zero backend novo.
 */
export function useKnowledgeMetrics(days = 30): KnowledgeMetrics {
  const [state, setState] = useState<KnowledgeMetrics>({
    loading: true,
    solicitacoesEvitadas: 0,
    totalFeedback: 0,
    taxaResolucao: 0,
    topArtigos: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("knowledge_feedback")
        .select("id, resolved, article_id")
        .gte("created_at", since);
      if (cancelled) return;
      if (error || !Array.isArray(data)) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      const total = data.length;
      const evitadas = data.filter((r) => r.resolved === true).length;
      const taxa = total > 0 ? Math.round((evitadas / total) * 100) : 0;

      const counts = new Map<string, number>();
      for (const r of data) {
        if (r.resolved && r.article_id) counts.set(r.article_id, (counts.get(r.article_id) ?? 0) + 1);
      }
      const topIds = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      let topArtigos: KnowledgeMetrics["topArtigos"] = [];
      if (topIds.length > 0) {
        const { data: arts } = await supabase
          .from("knowledge_articles")
          .select("id, titulo")
          .in("id", topIds.map(([id]) => id));
        if (cancelled) return;
        const titulos = new Map((arts ?? []).map((a) => [a.id, a.titulo] as const));
        topArtigos = topIds.map(([id, n]) => ({
          article_id: id,
          titulo: titulos.get(id) ?? "Conteúdo",
          resolvidas: n,
        }));
      }

      setState({
        loading: false,
        solicitacoesEvitadas: evitadas,
        totalFeedback: total,
        taxaResolucao: taxa,
        topArtigos,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return state;
}
