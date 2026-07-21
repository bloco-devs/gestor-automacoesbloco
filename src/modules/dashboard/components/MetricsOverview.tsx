import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Bot, CheckCircle2, Clock, ListChecks, Sparkles } from "lucide-react";
import type { DemandMetrics } from "../service";

function fmtHoras(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

export function MetricsOverview({ metrics, loading }: { metrics: DemandMetrics | null; loading: boolean }) {
  const cards = [
    {
      label: "Total de Solicitações",
      value: metrics ? `${metrics.total}` : "—",
      hint: metrics ? `${metrics.ativas} ativas · ${metrics.concluidas} concluídas` : "",
      icon: ListChecks,
      accent: "text-info",
    },
    {
      label: "Cumprimento de SLA",
      value: metrics?.slaCumprimentoPct !== null && metrics ? `${metrics.slaCumprimentoPct.toFixed(1)}%` : "—",
      hint: "Concluídas no prazo",
      icon: CheckCircle2,
      accent: "text-success",
    },
    {
      label: "Tempo Médio de Resolução",
      value: metrics ? fmtHoras(metrics.tempoMedioResolucaoHoras) : "—",
      hint: "Da abertura à conclusão",
      icon: Clock,
      accent: "text-warning",
    },
    {
      label: "Em Alerta / Estouradas",
      value: metrics ? `${metrics.emAlerta} / ${metrics.estouradas}` : "—",
      hint: "SLA em risco ou vencido",
      icon: AlertTriangle,
      accent: "text-destructive",
    },
    {
      label: "Chamados Defletidos por IA",
      value: metrics ? `${metrics.respondidasPorIA + metrics.defletidasKB}` : "—",
      hint: metrics
        ? `${metrics.respondidasPorIA} respondidos · ${metrics.defletidasKB} resolvidos na KB`
        : "",
      icon: Bot,
      accent: "text-primary",
    },
    {
      label: "Economia Operacional",
      value: metrics ? `${metrics.economiaPct.toFixed(1)}%` : "—",
      hint: "Casos resolvidos sem intervenção humana",
      icon: Sparkles,
      accent: "text-info",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            <c.icon className={`size-4 ${c.accent}`} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{c.value}</div>
                {c.hint && <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
