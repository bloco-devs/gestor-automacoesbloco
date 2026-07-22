import { CheckCircle2, Clock, Repeat, TrendingUp, XCircle, Zap } from "lucide-react";
import { KpiRow, Section, StatCard } from "@/design-system";
import type { AnalyticsResult } from "../types";

function ms(v: number | null): string {
  if (v === null) return "—";
  if (v < 1000) return `${Math.round(v)}ms`;
  return `${(v / 1000).toFixed(1)}s`;
}

export function WorkflowSection({ data }: { data: AnalyticsResult }) {
  const w = data.workflows;
  const successPct = w.execucoes ? (w.sucesso / w.execucoes) * 100 : null;
  return (
    <Section
      title="Workflow Automation"
      description="Execuções registradas em workflow_execution_logs no período."
    >
      <KpiRow>
        <StatCard label="Workflows ativos" value={`${w.ativos}/${w.totalDefinicoes}`} icon={Repeat} />
        <StatCard label="Execuções" value={w.execucoes} icon={Zap} />
        <StatCard
          label="Sucesso"
          value={successPct === null ? "—" : `${successPct.toFixed(0)}%`}
          tone={successPct === null ? "neutral" : successPct >= 90 ? "success" : successPct >= 70 ? "warning" : "danger"}
          icon={CheckCircle2}
        />
        <StatCard label="Falhas" value={w.falhas} tone={w.falhas > 0 ? "danger" : "success"} icon={XCircle} />
        <StatCard label="Duração média" value={ms(w.duracaoMediaMs)} icon={Clock} />
        <StatCard
          label="Economia estimada"
          value={`${w.economiaEstimadaMin} min`}
          tone="info"
          icon={TrendingUp}
          hint="~2 min por execução com sucesso"
        />
      </KpiRow>
    </Section>
  );
}
