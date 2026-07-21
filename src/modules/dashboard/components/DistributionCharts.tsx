import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { STATUS_COLUMNS, PRIORITY_META, TYPE_META } from "@/modules/demands/types";
import type { DemandMetrics } from "../service";

const STATUS_COLORS: Record<string, string> = {
  backlog: "hsl(var(--muted-foreground))",
  a_fazer: "hsl(var(--info))",
  em_desenvolvimento: "hsl(var(--warning))",
  em_testes: "hsl(var(--info))",
  homologacao: "hsl(var(--accent))",
  concluido: "hsl(var(--success))",
};
const PRIORITY_COLORS: Record<string, string> = {
  baixa: "hsl(var(--muted-foreground))",
  media: "hsl(var(--info))",
  alta: "hsl(var(--warning))",
  critica: "hsl(var(--destructive))",
};

export function StatusDistributionChart({ metrics, loading }: { metrics: DemandMetrics | null; loading: boolean }) {
  const data = metrics
    ? STATUS_COLUMNS.map((s) => ({ name: s.label, key: s.id, value: metrics.porStatus[s.id] ?? 0 }))
    : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function PriorityChart({ metrics, loading }: { metrics: DemandMetrics | null; loading: boolean }) {
  const data = metrics
    ? (Object.keys(PRIORITY_META) as (keyof typeof PRIORITY_META)[]).map((k) => ({
        name: PRIORITY_META[k].label, key: k, value: metrics.porPrioridade[k] ?? 0,
      }))
    : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Prioridade</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} innerRadius={45} paddingAngle={2}>
                {data.map((d) => <Cell key={d.key} fill={PRIORITY_COLORS[d.key]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function TypeChart({ metrics, loading }: { metrics: DemandMetrics | null; loading: boolean }) {
  const data = metrics
    ? (Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map((k) => ({
        name: TYPE_META[k].label, value: metrics.porTipo[k] ?? 0,
      }))
    : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} width={110} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
