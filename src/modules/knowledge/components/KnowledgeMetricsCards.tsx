import { memo } from "react";
import { Sparkles, TrendingDown, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKnowledgeMetrics } from "../hooks/useKnowledgeMetrics";

/**
 * Cards para gestores no Dashboard.
 * Fonte: `knowledge_feedback` (via RLS: admin vê tudo, usuário comum vê apenas o próprio).
 */
export const KnowledgeMetricsCards = memo(function KnowledgeMetricsCards() {
  const { loading, solicitacoesEvitadas, taxaResolucao, topArtigos } = useKnowledgeMetrics(30);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingDown className="size-4 text-emerald-500" /> Solicitações evitadas (30d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{solicitacoesEvitadas}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Problemas resolvidos direto no Portal, sem abrir chamado.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4 text-amber-500" /> Taxa de resolução
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{taxaResolucao}%</div>
          <p className="mt-1 text-xs text-muted-foreground">
            % das sugestões que resolveram sem virar solicitação.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="size-4 text-primary" /> Conteúdos mais úteis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topArtigos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda sem dados suficientes.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {topArtigos.map((a) => (
                <li key={a.article_id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{a.titulo}</span>
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-600">
                    {a.resolvidas}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
