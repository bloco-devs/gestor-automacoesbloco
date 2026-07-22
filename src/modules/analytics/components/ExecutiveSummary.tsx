import {
  Activity,
  AlertTriangle,
  Bot,
  BookOpen,
  CheckCircle2,
  Cog,
  Inbox,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { KpiRow, Section, StatCard } from "@/design-system";
import type { AnalyticsResult } from "../types";

function pct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export function ExecutiveSummary({ data }: { data: AnalyticsResult }) {
  const sla = data.sla;
  return (
    <Section title="Resumo executivo" description="Visão consolidada do período selecionado.">
      <KpiRow>
        <StatCard label="Demandas abertas" value={data.totalOpen} icon={Inbox} tone="info" />
        <StatCard label="Demandas concluídas" value={data.totalClosed} icon={CheckCircle2} tone="success" />
        <StatCard
          label="SLA cumprido"
          value={pct(sla.cumprimentoPct)}
          icon={ShieldCheck}
          tone={
            sla.cumprimentoPct === null
              ? "neutral"
              : sla.cumprimentoPct >= 90
                ? "success"
                : sla.cumprimentoPct >= 70
                  ? "warning"
                  : "danger"
          }
        />
        <StatCard
          label="SLA violado"
          value={sla.violadas}
          icon={AlertTriangle}
          tone={sla.violadas > 0 ? "danger" : "success"}
        />
        <StatCard label="Workflows executados" value={data.workflows.execucoes} icon={Repeat} />
        <StatCard label="Chamadas IA" value={data.ai.totalCalls} icon={Bot} />
        <StatCard label="Artigos publicados" value={data.knowledge.publicados} icon={BookOpen} />
        <StatCard
          label="Smart Routing ativo"
          value={`${data.routing.ativos}/${data.routing.candidatos}`}
          icon={data.routing.ativos > 0 ? Activity : Cog}
          tone={data.routing.ativos > 0 ? "success" : "neutral"}
          hint={`Carga média ${data.routing.cargaMedia.toFixed(1)}`}
        />
      </KpiRow>
    </Section>
  );
}
