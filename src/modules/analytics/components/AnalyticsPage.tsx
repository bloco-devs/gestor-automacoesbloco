import { useCallback, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyPanel, PageHeader, PageShell, Section } from "@/design-system";
import { useAnalyticsData } from "../hooks/useAnalyticsData";
import { AnalyticsFiltersBar } from "./AnalyticsFiltersBar";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { TrendSection } from "./TrendSection";
import { TeamProductivity } from "./TeamProductivity";
import { SystemsRanking } from "./SystemsRanking";
import { RoutingSection } from "./RoutingSection";
import { WorkflowSection } from "./WorkflowSection";
import { KnowledgeSection } from "./KnowledgeSection";
import { AISection } from "./AISection";
import { SLASection } from "./SLASection";
import { InsightsSection } from "./InsightsSection";
import { EcossistemaSection } from "./EcossistemaSection";
import { AfinidadeSistemaSection } from "./AfinidadeSistemaSection";
import { SystemAffinityHeatmap } from "./SystemAffinityHeatmap";
import { SystemAffinityRanking } from "./SystemAffinityRanking";
import { SystemCoverageCard } from "./SystemCoverageCard";
import { SystemRiskCard } from "./SystemRiskCard";
import { SystemInsights } from "./SystemInsights";
import { downloadCsv, toCsv, triggerPrint } from "../utils/csv";
import type { AnalyticsFilters } from "../types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProfilesByIds, getUserWorkloads } from "@/modules/demands/service";

interface PlataformaLite {
  id: string;
  nome: string;
}

async function fetchSystems(): Promise<PlataformaLite[]> {
  const { data } = await supabase.from("plataformas").select("id, nome").order("nome");
  return (data ?? []) as PlataformaLite[];
}

export function AnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({ period: "30d" });
  const { data, loading, error, refetch } = useAnalyticsData(filters);

  const systemsQ = useQuery({ queryKey: ["analytics", "systems-select"], queryFn: fetchSystems, staleTime: 5 * 60_000 });
  const workloadsQ = useQuery({
    queryKey: ["analytics", "workloads-select"],
    queryFn: () => getUserWorkloads().catch(() => []),
    staleTime: 5 * 60_000,
  });
  const respIds = useMemo(() => (workloadsQ.data ?? []).map((w) => w.user_id), [workloadsQ.data]);
  const respProfilesQ = useQuery({
    queryKey: ["analytics", "resp-select", respIds.join(",")],
    queryFn: () => getProfilesByIds(respIds),
    enabled: respIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const responsaveis = useMemo(() => {
    const map = respProfilesQ.data ?? new Map();
    return Array.from(map.values()).sort((a, b) =>
      (a.nome ?? a.email ?? "").localeCompare(b.nome ?? b.email ?? ""),
    );
  }, [respProfilesQ.data]);

  const handleExport = useCallback(() => {
    if (!data) return;
    const rows = data.demandsFiltered.map((d) => ({
      id: d.id,
      titulo: d.title,
      status: d.status,
      prioridade: d.priority,
      tipo: d.type,
      responsavel: d.assigned_to ?? "",
      criado_em: d.created_at,
      atualizado_em: d.updated_at,
      sla_status: d.sla_status,
      sla_vence_em: d.sla_due_at ?? "",
      sistema_id: d.system_id ?? "",
    }));
    const csv = toCsv(rows);
    downloadCsv(`analytics-${filters.period}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }, [data, filters.period]);

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        subtitle="Inteligência operacional sobre demandas, SLA, IA, workflows e knowledge."
        icon={<BarChart3 className="size-6" aria-hidden />}
      />

      <AnalyticsFiltersBar
        filters={filters}
        onChange={setFilters}
        onExport={handleExport}
        onPrint={triggerPrint}
        onRefresh={refetch}
        loading={loading}
        systems={systemsQ.data ?? []}
        responsaveis={responsaveis}
      />

      {error ? (
        <EmptyPanel
          title="Falha ao carregar analytics"
          description={error.message}
        />
      ) : !data ? (
        <Section>
          <div role="status" aria-live="polite" className="ds-caption text-muted-foreground">
            Carregando dados agregados…
          </div>
        </Section>
      ) : (
        <>
          <ExecutiveSummary data={data} />
          <TrendSection data={data} />
          <TeamProductivity data={data} />
          <SystemsRanking data={data} />
          <RoutingSection data={data} />
          <WorkflowSection data={data} />
          <KnowledgeSection data={data} />
          <AISection data={data} />
          <SLASection data={data} />
          <InsightsSection data={data} workloads={workloadsQ.data ?? []} />
          <EcossistemaSection />
          <AfinidadeSistemaSection />
          <EcossistemaSection />
          <AfinidadeSistemaSection />

          {/* F018.5 — Afinidade do Ecossistema (analítico) */}
          <Section
            id="analytics-ecossistema-afinidade"
            title="Afinidade do Ecossistema"
            description="Heatmap, ranking, cobertura, riscos e insights derivados do CandidatePool (F018.4)."
          >
            <SystemAffinityHeatmap />
            <SystemAffinityRanking />
            <SystemCoverageCard />
            <SystemRiskCard />
            <SystemInsights />
          </Section>
        </>
      )}
    </PageShell>
  );
}
