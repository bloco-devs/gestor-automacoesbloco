import { useMemo } from "react";
import { Activity } from "lucide-react";
import { PageShell, PageHeader, Section, KpiRow, StatCard } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { collectRuntimeHealth, collectPerformance, collectSystemInfo } from "@/modules/platform-health";

const TONE: Record<string, "positive" | "warning" | "negative"> = {
  green: "positive",
  amber: "warning",
  red: "negative",
};

export default function PlatformHealthPage() {
  const runtimes = useMemo(() => collectRuntimeHealth(), []);
  const perf = useMemo(() => collectPerformance(), []);
  const system = useMemo(() => collectSystemInfo(), []);

  return (
    <PageShell>
      <PageHeader
        title="Platform Health"
        subtitle="Visão consolidada dos runtimes, performance e sistema."
        icon={<Activity className="h-6 w-6" />}
      />

      <Section title="Runtime" description="Status somente leitura de cada camada da plataforma.">
        <KpiRow>
          {runtimes.map((r) => (
            <StatCard
              key={r.id}
              label={r.label}
              value={r.status === "green" ? "OK" : r.status === "amber" ? "Atenção" : "Falha"}
              hint={r.detail}
              tone={TONE[r.status]}
            />
          ))}
        </KpiRow>
      </Section>

      <Section title="Performance" description="Amostras agregadas em memória — médias, P95 e P99.">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {perf.map((p) => (
            <div key={p.label} className="rounded-xl border p-3 bg-card">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{p.label}</div>
              <div className="mt-1 flex items-baseline gap-3">
                <div className="text-lg font-semibold">{p.avgMs}ms</div>
                <div className="text-xs text-muted-foreground">P95 {p.p95Ms}ms · P99 {p.p99Ms}ms</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Sistema" description="Metadados de build e versões.">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(system).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border p-3 bg-card">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
              <Badge variant="secondary" className="font-mono text-xs">{String(v)}</Badge>
            </div>
          ))}
        </div>
      </Section>
    </PageShell>
  );
}
