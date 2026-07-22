import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, Database, Radio, Workflow, Route, BookOpen, Gauge, RefreshCw } from "lucide-react";
import { PageShell, PageHeader, Section, StatCard, KpiRow } from "@/design-system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchIaUsage, aggregateIaUsage, periodToSinceIso } from "@/lib/iaUsage";

type Tone = "success" | "warning" | "danger" | "info";
type Layer = {
  key: string;
  label: string;
  icon: typeof Activity;
  tone: Tone;
  status: string;
  detail: string;
};

function toneBadge(tone: Tone) {
  const map: Record<Tone, string> = {
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    danger: "bg-red-500/10 text-red-600 border-red-500/20",
    info: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  };
  return map[tone];
}

async function measure<T>(fn: () => Promise<T>): Promise<{ ms: number; ok: boolean; value?: T; error?: string }> {
  const t0 = performance.now();
  try {
    const value = await fn();
    return { ms: Math.round(performance.now() - t0), ok: true, value };
  } catch (e) {
    return { ms: Math.round(performance.now() - t0), ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default function SaudePage() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [kpis, setKpis] = useState<{ ia: number; sql: number; erroIa: number; execWf: number }>({
    ia: 0,
    sql: 0,
    erroIa: 0,
    execWf: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    const since = periodToSinceIso("24h");
    const next: Layer[] = [];

    // Supabase
    const ping = await measure(async () => {
      const { error } = await supabase.from("solicitacoes").select("id", { count: "exact", head: true }).limit(1);
      if (error) throw error;
    });
    next.push({
      key: "supabase",
      label: "Supabase",
      icon: Database,
      tone: ping.ok ? (ping.ms < 400 ? "success" : "warning") : "danger",
      status: ping.ok ? "Operacional" : "Erro",
      detail: ping.ok ? `ping ${ping.ms} ms` : ping.error ?? "falha",
    });

    // Realtime probe
    const rt = await measure(
      () =>
        new Promise<void>((resolve, reject) => {
          const ch = supabase.channel(`saude-probe-${Date.now()}`);
          const timer = setTimeout(() => {
            supabase.removeChannel(ch);
            reject(new Error("timeout"));
          }, 5000);
          ch.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              clearTimeout(timer);
              supabase.removeChannel(ch);
              resolve();
            }
          });
        }),
    );
    next.push({
      key: "realtime",
      label: "Realtime",
      icon: Radio,
      tone: rt.ok ? "success" : "danger",
      status: rt.ok ? "Conectado" : "Sem eco",
      detail: rt.ok ? `handshake ${rt.ms} ms` : rt.error ?? "falha",
    });

    // AI
    let iaLatency = 0;
    let iaErrorRate = 0;
    try {
      const rows = await fetchIaUsage({ sinceIso: since, limit: 500 });
      const agg = aggregateIaUsage(rows);
      iaErrorRate = agg.errorRate;
      iaLatency = agg.totalCalls;
      next.push({
        key: "ai",
        label: "AI Gateway",
        icon: Bot,
        tone: iaErrorRate > 0.2 ? "danger" : iaErrorRate > 0.05 ? "warning" : "success",
        status: iaErrorRate > 0.2 ? "Instável" : "Saudável",
        detail: `${agg.totalCalls} chamadas · erro ${(iaErrorRate * 100).toFixed(1)}%`,
      });
    } catch {
      next.push({ key: "ai", label: "AI Gateway", icon: Bot, tone: "info", status: "Sem dados", detail: "24h" });
    }

    // Workflow runtime
    let wfExec = 0;
    try {
      const { data, error } = await supabase
        .from("workflow_execution_logs")
        .select("status, duration_ms, created_at")
        .gte("created_at", since)
        .limit(500);
      if (error) throw error;
      wfExec = data?.length ?? 0;
      const errors = (data ?? []).filter((r) => r.status !== "success").length;
      const rate = wfExec ? errors / wfExec : 0;
      next.push({
        key: "workflow",
        label: "Workflow Runtime",
        icon: Workflow,
        tone: wfExec === 0 ? "info" : rate > 0.2 ? "danger" : rate > 0.05 ? "warning" : "success",
        status: wfExec === 0 ? "Ocioso" : `${wfExec} execuções`,
        detail: `falhas ${(rate * 100).toFixed(1)}%`,
      });
    } catch {
      next.push({ key: "workflow", label: "Workflow Runtime", icon: Workflow, tone: "info", status: "—", detail: "—" });
    }

    // Routing (proxy: demandas atribuídas nas últimas 24h)
    try {
      const { count } = await supabase
        .from("solicitacoes")
        .select("id", { count: "exact", head: true })
        .not("owner_id", "is", null)
        .gte("updated_at", since);
      next.push({
        key: "routing",
        label: "Smart Routing",
        icon: Route,
        tone: "success",
        status: `${count ?? 0} atribuições`,
        detail: "últimas 24h",
      });
    } catch {
      next.push({ key: "routing", label: "Smart Routing", icon: Route, tone: "info", status: "—", detail: "—" });
    }

    // Knowledge
    try {
      const { count } = await supabase
        .from("knowledge_articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");
      next.push({
        key: "knowledge",
        label: "Knowledge",
        icon: BookOpen,
        tone: (count ?? 0) > 0 ? "success" : "warning",
        status: `${count ?? 0} artigos`,
        detail: "publicados",
      });
    } catch {
      next.push({ key: "knowledge", label: "Knowledge", icon: BookOpen, tone: "info", status: "—", detail: "—" });
    }

    setLayers(next);
    setKpis({ ia: iaLatency, sql: ping.ms, erroIa: iaErrorRate, execWf: wfExec });
    setRefreshedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overallTone = useMemo<Tone>(() => {
    if (layers.some((l) => l.tone === "danger")) return "danger";
    if (layers.some((l) => l.tone === "warning")) return "warning";
    return "success";
  }, [layers]);

  return (
    <PageShell>
      <PageHeader
        title="Centro de Saúde"
        subtitle="Status de todas as camadas da plataforma em tempo real."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={"mr-2 h-4 w-4" + (loading ? " animate-spin" : "")} aria-hidden />
            Atualizar
          </Button>
        }
      />

      <Section>
        <KpiRow>
          <StatCard label="Status geral" value={overallTone === "success" ? "Saudável" : overallTone === "warning" ? "Atenção" : "Crítico"} tone={overallTone === "danger" ? "danger" : overallTone === "warning" ? "warning" : "success"} icon={Activity} />
          <StatCard label="Chamadas IA (24h)" value={kpis.ia} icon={Bot} />
          <StatCard label="Latência SQL" value={`${kpis.sql} ms`} icon={Database} />
          <StatCard label="Execuções Workflow" value={kpis.execWf} icon={Workflow} />
        </KpiRow>
      </Section>

      <Section title="Camadas">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {layers.map((l) => {
            const Icon = l.icon;
            return (
              <Card key={l.key} className="surface-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    {l.label}
                  </CardTitle>
                  <Badge variant="outline" className={toneBadge(l.tone)}>{l.status}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{l.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {refreshedAt && (
          <p className="pt-3 text-xs text-muted-foreground flex items-center gap-1">
            <Gauge className="h-3 w-3" aria-hidden />
            Atualizado {refreshedAt.toLocaleTimeString("pt-BR")} · auto-refresh 60s
          </p>
        )}
      </Section>
    </PageShell>
  );
}
