import {
  MetricsOverview,
  PriorityChart,
  SLAHealthBar,
  StatusDistributionChart,
  TypeChart,
  useDemandMetrics,
} from "@/modules/dashboard";

export default function AdminDashboard() {
  const { metrics, isLoading, error } = useDemandMetrics();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-brand font-bold">Dashboard da Operação</h1>
        <p className="text-sm text-muted-foreground">
          Visão executiva das demandas, cumprimento de SLA e performance por status/prioridade.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Falha ao carregar métricas. Tente novamente em alguns instantes.
        </div>
      )}

      <MetricsOverview metrics={metrics} loading={isLoading} />
      <SLAHealthBar metrics={metrics} loading={isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <StatusDistributionChart metrics={metrics} loading={isLoading} />
        <PriorityChart metrics={metrics} loading={isLoading} />
      </div>
      <TypeChart metrics={metrics} loading={isLoading} />
    </div>
  );
}
