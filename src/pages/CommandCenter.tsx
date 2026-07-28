import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Command as CommandIcon,
  Gauge,
  Inbox as InboxIcon,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  Plus,
  UserX,
  Workflow as WorkflowIcon,
  Zap,
} from "lucide-react";
import { useOperationsData } from "@/modules/operations";
import { MetricCard } from "@/modules/operations/components/MetricCard";
import { CriticalItems } from "@/modules/operations/components/CriticalItems";
import { LiveActivity } from "@/modules/operations/components/LiveActivity";
import { TeamWorkload } from "@/modules/operations/components/TeamWorkload";
import { AIInsightsPanel } from "@/modules/operations/components/AIInsightsPanel";
import { UnassignedQueueCard } from "@/modules/routing";
import { WorkflowsOpsCard } from "@/modules/workflow-builder";
import { EcossistemaLivePanel } from "@/modules/ecossistema";
import { Button } from "@/components/ui/button";

const CommandCenter = memo(function CommandCenter() {
  const { data, profiles, loading, error, refetch } = useOperationsData();

  const kpis = useMemo(() => {
    const b = data?.buckets;
    const m = data?.metrics;
    return {
      criticas: b?.criticas ?? 0,
      slaRisco: (b?.slaEmAtencao ?? 0) + (b?.slaEstourado ?? 0),
      semResp: b?.semResponsavel ?? 0,
      iaEvitadas: m ? m.respondidasPorIA + m.defletidasKB : 0,
      workflows: data?.insights.filter((i) => /workflow/i.test(i.title)).length ?? 0,
      alertas: data?.alerts.length ?? 0,
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-[1920px] space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold md:text-3xl">
            <CommandIcon className="size-6 text-primary" aria-hidden />
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Cockpit da operação — decisões rápidas, contexto completo.
          </p>
        </div>
        <button
          onClick={refetch}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Atualizar agora
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Não foi possível carregar: {error.message}
        </div>
      ) : null}

      {/* KPIs críticos */}
      <section aria-labelledby="cc-kpis">
        <h2 id="cc-kpis" className="sr-only">
          Indicadores críticos
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="SLA em risco" value={kpis.slaRisco} icon={Gauge} tone="warning" />
          <MetricCard label="Críticos" value={kpis.criticas} icon={AlertTriangle} tone="danger" />
          <MetricCard label="Sem responsável" value={kpis.semResp} icon={UserX} tone="warning" />
          <MetricCard label="Evitadas pela IA" value={kpis.iaEvitadas} icon={Bot} tone="info" hint="Deflexão + auto" />
          <MetricCard label="Insights" value={data?.insights.length ?? 0} icon={Zap} />
          <MetricCard label="Alertas" value={kpis.alertas} icon={ListChecks} tone={kpis.alertas > 0 ? "warning" : "default"} />
        </div>
      </section>

      {/* Fila prioritária + Atividade em tempo real */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CriticalItems items={data?.critical ?? []} profiles={profiles} />
        <LiveActivity items={data?.activity ?? []} profiles={profiles} />
      </section>

      {/* Equipe + Insights inteligentes */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TeamWorkload workloads={data?.workloads ?? []} profiles={profiles} />
        <AIInsightsPanel insights={data?.insights ?? []} />
      </section>

      {/* Smart Routing + Workflows + Ecossistema */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <UnassignedQueueCard />
        </div>
        <div className="space-y-4">
          <WorkflowsOpsCard />
          <EcossistemaLivePanel />
        </div>
      </section>

      {/* Ações rápidas */}
      <section aria-labelledby="cc-actions" className="rounded-xl border border-border bg-card/40 p-4">
        <h2 id="cc-actions" className="mb-3 text-sm font-medium text-muted-foreground">
          Ações rápidas
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickAction to="/nova-solicitacao" icon={<Plus className="size-4" />} label="Nova demanda" />
          <QuickAction to="/workspace" icon={<LayoutGrid className="size-4" />} label="Workspace" />
          <QuickAction to="/trabalho/inbox" icon={<InboxIcon className="size-4" />} label="Inbox" />
          <QuickAction to="/operacoes" icon={<Gauge className="size-4" />} label="Operações" />
          <QuickAction to="/workflows" icon={<WorkflowIcon className="size-4" />} label="Workflows" />
          <QuickAction to="/base-conhecimento" icon={<LifeBuoy className="size-4" />} label="Knowledge" />
        </div>
        {loading ? (
          <p className="mt-3 text-xs text-muted-foreground">Sincronizando dados…</p>
        ) : null}
      </section>
    </div>
  );
});

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="gap-2">
      <Link to={to}>
        {icon}
        {label}
      </Link>
    </Button>
  );
}

export default CommandCenter;
