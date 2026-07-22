import { AlertTriangle, Bot, CheckCircle2, Clock, Gauge, ListChecks, Sparkles, UserX } from "lucide-react";
import { useLanguage } from "@/modules/ux";
import { useOperationsData } from "../hooks/useOperationsData";
import { AIInsightsPanel } from "./AIInsightsPanel";
import { CriticalItems } from "./CriticalItems";
import { HealthCard } from "./HealthCard";
import { LiveActivity } from "./LiveActivity";
import { MetricCard } from "./MetricCard";
import { TeamWorkload } from "./TeamWorkload";
import { UnassignedQueueCard } from "@/modules/routing";
import { WorkflowsOpsCard } from "@/modules/workflow-builder";

function fmtHours(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

export function OperationsPage() {
  const { persona } = useLanguage();
  const { data, profiles, loading, error, refetch } = useOperationsData();
  const isExec = persona === "gestor";
  const heading = isExec ? "Centro de Operações" : "Centro Operacional";
  const subtitle = isExec
    ? "Visão consolidada da operação em tempo real."
    : "Fila, equipe e alertas em uma tela única.";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1920px] mx-auto">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
            <Gauge className="h-6 w-6 text-primary" aria-hidden />
            {heading}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <button
          onClick={refetch}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Atualizar agora
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Não foi possível carregar os dados: {error.message}
        </div>
      ) : null}

      {/* Resumo Geral */}
      <section aria-labelledby="op-resumo">
        <h2 id="op-resumo" className="sr-only">Resumo geral</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <MetricCard label="Abertas" value={data?.metrics ? data.metrics.ativas : loading ? "…" : 0} icon={ListChecks} tone="info" />
          <MetricCard label="Críticas" value={data?.buckets.criticas ?? 0} icon={AlertTriangle} tone="danger" />
          <MetricCard label="Em andamento" value={data?.buckets.emAndamento ?? 0} icon={Clock} />
          <MetricCard label="Aguardando cliente" value={data?.buckets.aguardandoCliente ?? 0} icon={UserX} tone="warning" />
          <MetricCard label="Concluídas hoje" value={data?.buckets.concluidasHoje ?? 0} icon={CheckCircle2} tone="success" />
          <MetricCard
            label="Evitadas pela IA"
            value={data?.metrics ? data.metrics.respondidasPorIA + data.metrics.defletidasKB : 0}
            icon={Bot}
            tone="info"
            hint="Deflexão + auto-resposta"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <HealthCard title="SLA geral" value={data?.metrics?.slaCumprimentoPct ?? null} hint="% concluídas no prazo" />
          <MetricCard
            label="Tempo médio de atendimento"
            value={fmtHours(data?.metrics?.tempoMedioResolucaoHoras ?? null)}
            icon={Clock}
            hint="Da abertura à conclusão"
          />
          <MetricCard
            label="Economia operacional"
            value={data?.metrics ? `${data.metrics.economiaPct.toFixed(1)}%` : "—"}
            icon={Sparkles}
            tone="info"
            hint="Casos sem intervenção humana"
          />
        </div>
      </section>

      {/* Fila / Insights */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <CriticalItems items={data?.critical ?? []} profiles={profiles} />
        </div>
        <div>
          <AIInsightsPanel insights={data?.insights ?? []} />
        </div>
      </section>

      {/* Equipe / Atividade */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TeamWorkload workloads={data?.workloads ?? []} profiles={profiles} />
        <LiveActivity items={data?.activity ?? []} profiles={profiles} />
      </section>

      {/* Smart Routing + Workflows */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <UnassignedQueueCard />
        </div>
        <div>
          <WorkflowsOpsCard />
        </div>
      </section>
    </div>
  );
}

export default OperationsPage;
