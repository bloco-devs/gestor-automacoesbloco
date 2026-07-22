import { useMemo } from "react";
import { Bot, TrendingUp, AlertTriangle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiRow, Section, StatCard } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsResult } from "../types";

export function AISection({ data }: { data: AnalyticsResult }) {
  const ai = data.ai;
  const chart = useMemo(() => ai.byAcao.map((r) => ({ name: r.key, count: r.count })), [ai.byAcao]);
  return (
    <Section
      title="Inteligência Artificial"
      description="Uso do AI Gateway (ia_uso_log) no período."
    >
      <KpiRow>
        <StatCard label="Chamadas" value={ai.totalCalls} icon={Bot} />
        <StatCard label="Tokens de entrada" value={ai.totalTokensIn.toLocaleString("pt-BR")} />
        <StatCard label="Tokens de saída" value={ai.totalTokensOut.toLocaleString("pt-BR")} />
        <StatCard
          label="Taxa de erro"
          value={`${(ai.errorRate * 100).toFixed(1)}%`}
          tone={ai.errorRate > 0.2 ? "danger" : ai.errorRate > 0.05 ? "warning" : "success"}
          icon={ai.errorRate > 0.05 ? AlertTriangle : TrendingUp}
        />
      </KpiRow>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="ds-card-title">Uso por ação</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="ds-card-title">Uso por modelo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {ai.byModelo.length === 0 ? (
                <li className="p-4 ds-caption text-muted-foreground">Sem dados.</li>
              ) : (
                ai.byModelo.map((m) => (
                  <li key={m.key} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span className="truncate font-mono text-xs">{m.key}</span>
                    <span className="tabular-nums text-muted-foreground">{m.count}</span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
