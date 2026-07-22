import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, Target, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageShell, PageHeader, Section, StatCard, KpiRow } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  status: string | null;
  score: number | null;
  criado_em: string | null;
  updated_at: string | null;
  categoria: string | null;
  prioridade: string | null;
};

const WINDOW_DAYS = 30;

function bucketByDay(rows: Row[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = (r.criado_em ?? r.updated_at ?? "").slice(0, 10);
    if (!d) continue;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count }));
}

function bucketByField(rows: Row[], field: keyof Row) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = (r[field] as string | null) ?? "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function calcCycleTime(rows: Row[]) {
  const closed = rows.filter((r) => r.status && ["concluido", "concluído", "closed", "done"].includes(r.status.toLowerCase()));
  if (!closed.length) return { avg: 0, count: 0 };
  const durations = closed
    .map((r) => {
      const start = r.criado_em ? new Date(r.criado_em).getTime() : 0;
      const end = r.updated_at ? new Date(r.updated_at).getTime() : 0;
      return end - start;
    })
    .filter((d) => d > 0);
  const avgMs = durations.reduce((s, v) => s + v, 0) / (durations.length || 1);
  return { avg: avgMs / (1000 * 60 * 60 * 24), count: durations.length };
}

const PALETTE = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export default function AnalyticsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("solicitacoes")
        .select("id, status, score, criado_em, updated_at, categoria, prioridade")
        .gte("criado_em", since)
        .limit(1000);
      if (!cancelled) {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byDay = useMemo(() => bucketByDay(rows), [rows]);
  const byStatus = useMemo(() => bucketByField(rows, "status"), [rows]);
  const byCategoria = useMemo(() => bucketByField(rows, "categoria"), [rows]);
  const byPrioridade = useMemo(() => bucketByField(rows, "prioridade"), [rows]);
  const cycle = useMemo(() => calcCycleTime(rows), [rows]);
  const avgScore = useMemo(() => {
    const s = rows.filter((r) => typeof r.score === "number");
    if (!s.length) return 0;
    return s.reduce((a, r) => a + (r.score ?? 0), 0) / s.length;
  }, [rows]);

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        subtitle={`Últimos ${WINDOW_DAYS} dias · ${rows.length} demandas`}
      />

      <Section>
        <KpiRow>
          <StatCard label="Total no período" value={rows.length} icon={BarChart3} />
          <StatCard label="Concluídas" value={cycle.count} tone="success" icon={Target} />
          <StatCard label="Cycle time médio" value={`${cycle.avg.toFixed(1)}d`} tone="info" icon={Clock} />
          <StatCard label="Score médio" value={avgScore.toFixed(1)} tone="warning" icon={TrendingUp} />
        </KpiRow>
      </Section>

      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
          <TabsTrigger value="sla">SLA / Ciclo</TabsTrigger>
        </TabsList>

        <TabsContent value="volume">
          <Card>
            <CardHeader><CardTitle className="text-base">Demandas por dia</CardTitle></CardHeader>
            <CardContent className="h-80">
              {loading ? null : (
                <ResponsiveContainer>
                  <LineChart data={byDay} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribuicao" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Por status</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <BarChart data={byStatus}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="key" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {byStatus.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Por categoria</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <BarChart data={byCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="key" type="category" fontSize={11} width={110} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--info))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">Por prioridade</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer>
                <BarChart data={byPrioridade}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="key" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--warning))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card>
            <CardHeader><CardTitle className="text-base">Cycle time — visão simplificada</CardTitle></CardHeader>
            <CardContent>
              <p className="ds-body text-muted-foreground">
                Média de {cycle.avg.toFixed(1)} dias entre criação e conclusão em {cycle.count} demandas concluídas nos últimos {WINDOW_DAYS} dias.
                O SLA formal por política é gerenciado em <a className="text-primary underline" href="/admin/configuracoes/sla">Configurações → SLA</a>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
