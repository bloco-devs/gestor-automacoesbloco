import { Route } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiRow, Section, StatCard, EmptyPanel } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsResult } from "../types";

export function RoutingSection({ data }: { data: AnalyticsResult }) {
  const r = data.routing;
  const chart = r.distribuicao.map((d) => ({
    name: (d.nome ?? d.user_id.slice(0, 6)).split(" ")[0],
    carga: d.carga,
  }));
  return (
    <Section
      title="Smart Routing"
      description="Distribuição da carga entre os atendentes elegíveis pelo motor de roteamento."
    >
      <KpiRow>
        <StatCard label="Candidatos elegíveis" value={r.candidatos} icon={Route} />
        <StatCard label="Ativos com carga" value={r.ativos} tone={r.ativos > 0 ? "success" : "neutral"} />
        <StatCard label="Carga média" value={r.cargaMedia.toFixed(1)} />
        <StatCard label="Carga máxima" value={r.cargaMax} tone={r.cargaMax > r.cargaMedia * 2 ? "warning" : "neutral"} />
      </KpiRow>

      {chart.length === 0 ? (
        <EmptyPanel
          icon={Route}
          title="Sem distribuição no momento"
          description="Nenhum atendente com carga ativa foi identificado."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="ds-card-title">Distribuição de carga</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="carga" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <p className="ds-caption text-muted-foreground">
        Nota: taxa de aceitação de sugestões não é persistida hoje. Os indicadores exibem a
        distribuição real da equipe usada pelo motor de Smart Routing.
      </p>
    </Section>
  );
}
