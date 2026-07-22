import { BookOpen, MessageCircleQuestion, Percent, TrendingUp } from "lucide-react";
import { KpiRow, Section, StatCard, EmptyPanel } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsResult } from "../types";

export function KnowledgeSection({ data }: { data: AnalyticsResult }) {
  const k = data.knowledge;
  return (
    <Section title="Knowledge" description="Base de conhecimento e deflexão de chamados no período.">
      <KpiRow>
        <StatCard label="Artigos publicados" value={k.publicados} icon={BookOpen} />
        <StatCard label="Feedbacks recebidos" value={k.totalFeedback} icon={MessageCircleQuestion} />
        <StatCard label="Deflexão estimada" value={k.deflexao} tone={k.deflexao > 0 ? "success" : "neutral"} icon={TrendingUp} />
        <StatCard
          label="Taxa de resolução"
          value={`${k.taxaResolucaoPct.toFixed(0)}%`}
          tone={k.taxaResolucaoPct >= 60 ? "success" : k.taxaResolucaoPct >= 30 ? "warning" : "neutral"}
          icon={Percent}
        />
      </KpiRow>

      {k.topArtigos.length === 0 ? (
        <EmptyPanel icon={BookOpen} title="Sem artigos com views" description="Nenhum artigo acessado no período." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="ds-card-title">Artigos mais acessados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60" aria-label="Artigos mais acessados">
              {k.topArtigos.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="truncate">{a.titulo}</span>
                  <span className="tabular-nums text-muted-foreground">{a.views} views</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </Section>
  );
}
