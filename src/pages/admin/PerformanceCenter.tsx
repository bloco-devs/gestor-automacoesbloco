import { useMemo } from "react";
import { Gauge } from "lucide-react";
import { PageShell, PageHeader, Section, KpiRow, StatCard } from "@/design-system";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { collectPerformance } from "@/modules/platform-health";

export default function PerformanceCenterPage() {
  const perf = useMemo(() => collectPerformance(), []);
  const avg = useMemo(() => Math.round(perf.reduce((a, p) => a + p.avgMs, 0) / (perf.length || 1)), [perf]);
  const p95 = useMemo(() => Math.max(...perf.map((p) => p.p95Ms)), [perf]);
  const p99 = useMemo(() => Math.max(...perf.map((p) => p.p99Ms)), [perf]);

  return (
    <PageShell>
      <PageHeader
        title="Performance Center"
        subtitle="Latência agregada por camada. Amostras em memória, sem polling."
        icon={<Gauge className="size-6" />}
      />

      <KpiRow>
        <StatCard label="Média geral" value={`${avg}ms`} tone="neutral" />
        <StatCard label="Pior P95" value={`${p95}ms`} tone="warning" />
        <StatCard label="Pior P99" value={`${p99}ms`} tone="warning" />
        <StatCard label="Camadas" value={perf.length} tone="neutral" />
      </KpiRow>

      <Section title="Latência por camada">
        <div className="h-80 rounded-xl border bg-card p-3">
          <ResponsiveContainer>
            <BarChart data={perf}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgMs" name="Média" fill="hsl(var(--primary))" />
              <Bar dataKey="p95Ms" name="P95" fill="hsl(var(--muted-foreground))" />
              <Bar dataKey="p99Ms" name="P99" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </PageShell>
  );
}
